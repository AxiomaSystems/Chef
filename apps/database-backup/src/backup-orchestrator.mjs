import {
  BACKUP_ADVISORY_LOCK_KEY,
  createRecoveryDatabaseName,
  loadBackupConfiguration,
  normalizedCount,
  postgresChildEnvironment,
  quoteRecoveryIdentifier,
  redactUrlLikeContent,
  selectExpiredRecoveryDatabases,
  timestampSegment,
  validateCriticalTablesAndCounts,
  validateMigrationParity,
} from "./backup-contract.mjs";
import { createRuntimeDependencies } from "./pg-runtime.mjs";

const ALLOWED_LOG_FIELDS = new Set([
  "event", "status", "runId", "databaseName", "attempt", "durationMs",
  "migrationCount", "tableCounts", "databaseSizeBytes", "cleanupStatus",
]);

function logMetadata(dependencies, metadata) {
  const safe = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (ALLOWED_LOG_FIELDS.has(key)) safe[key] = value;
  }
  dependencies.log(safe);
}

const migrationQuery = `SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count
  FROM public."_prisma_migrations" ORDER BY started_at ASC, migration_name ASC`;
const tableQuery = `SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
const countQuery = `SELECT 'User' AS table, count(*)::text AS count FROM public."User"
  UNION ALL SELECT 'Recipe', count(*)::text FROM public."Recipe"
  UNION ALL SELECT 'ShoppingCart', count(*)::text FROM public."ShoppingCart"`;

async function queryValidationSnapshot(client) {
  const [migrations, tables, counts] = await Promise.all([
    client.query(migrationQuery),
    client.query(tableQuery),
    client.query(countQuery),
  ]);
  return {
    migrations: migrations.rows,
    tables: tables.rows.map((row) => row.table_name),
    counts: Object.fromEntries(counts.rows.map((row) => [row.table, row.count])),
  };
}

async function ensureMetadataTable(admin) {
  await admin.query(`CREATE TABLE IF NOT EXISTS preppie_backup_recovery_metadata (
    database_name text PRIMARY KEY,
    run_id text NOT NULL,
    attempt integer NOT NULL,
    status text NOT NULL,
    started_at timestamptz NOT NULL,
    completed_at timestamptz,
    duration_ms bigint,
    migration_count integer,
    table_counts jsonb,
    database_size_bytes bigint,
    verified_at timestamptz
  )`);
}

async function recordAttemptStart(admin, { databaseName, runId, attempt }) {
  await admin.query(
    `INSERT INTO preppie_backup_recovery_metadata
      (database_name, run_id, attempt, status, started_at)
      VALUES ($1, $2, $3, 'pending', NOW())`,
    [databaseName, runId, attempt],
  );
}

async function recordVerified(admin, { databaseName, durationMs, migrationCount, tableCounts, databaseSizeBytes }) {
  await admin.query(
    `UPDATE preppie_backup_recovery_metadata SET status = 'verified', completed_at = NOW(),
      duration_ms = $2, migration_count = $3, table_counts = $4::jsonb, database_size_bytes = $5,
      verified_at = NOW() WHERE database_name = $1`,
    [databaseName, String(durationMs), migrationCount, JSON.stringify(tableCounts), String(databaseSizeBytes)],
  );
}

async function recordFailed(admin, { databaseName, durationMs }) {
  await admin.query(
    `UPDATE preppie_backup_recovery_metadata SET status = 'failed', completed_at = NOW(),
      duration_ms = $2 WHERE database_name = $1`,
    [databaseName, String(durationMs)],
  );
}

async function retainVerifiedDatabases(admin) {
  const result = await admin.query(`SELECT database_name AS "databaseName", status,
    verified_at AS "verifiedAt" FROM preppie_backup_recovery_metadata WHERE status = 'verified'`);
  const expired = selectExpiredRecoveryDatabases(result.rows, 2);
  for (const database of expired) {
    await admin.query(`DROP DATABASE ${quoteRecoveryIdentifier(database.databaseName)}`);
    await admin.query("UPDATE preppie_backup_recovery_metadata SET status = 'deleted' WHERE database_name = $1", [database.databaseName]);
  }
}

async function endQuietly(client) {
  if (client) await client.end();
}

async function runSingleAttempt({ config, runId, attempt, admin, dependencies }) {
  const startedAt = dependencies.now();
  const databaseName = createRecoveryDatabaseName({
    runId: config.runId ?? runId,
    now: startedAt,
    attempt,
    randomSuffix: dependencies.randomSuffix(),
  });
  let created = false;
  let tempDirectory;
  let source;
  let restored;

  try {
    await recordAttemptStart(admin, { databaseName, runId, attempt });
    await admin.query(`CREATE DATABASE ${quoteRecoveryIdentifier(databaseName)}`);
    created = true;
    tempDirectory = await dependencies.createTempDirectory();
    const dumpPath = dependencies.makeDumpPath(tempDirectory, databaseName);

    source = await dependencies.createClient(config.source);
    await source.connect();
    const sourceSnapshot = await queryValidationSnapshot(source);
    await dependencies.runCommand(
      "pg_dump",
      ["--format=custom", "--schema=public", "--no-owner", "--no-acl", "--file", dumpPath],
      { env: postgresChildEnvironment(config.source, dependencies.processEnvironment) },
    );

    restored = await dependencies.createClient({ ...config.recoveryAdmin, database: databaseName });
    await restored.connect();
    await dependencies.runCommand(
      "pg_restore",
      ["--exit-on-error", "--no-owner", "--no-acl", "--file", dumpPath],
      { env: postgresChildEnvironment({ ...config.recoveryAdmin, database: databaseName }, dependencies.processEnvironment) },
    );
    const restoredSnapshot = await queryValidationSnapshot(restored);
    const { migrationCount } = validateMigrationParity(sourceSnapshot.migrations, restoredSnapshot.migrations);
    const { tableCounts } = validateCriticalTablesAndCounts({
      sourceTables: sourceSnapshot.tables,
      restoredTables: restoredSnapshot.tables,
      sourceCounts: sourceSnapshot.counts,
      restoredCounts: restoredSnapshot.counts,
    });
    await endQuietly(restored);
    restored = undefined;
    await endQuietly(source);
    source = undefined;

    const sizeResult = await admin.query("SELECT pg_database_size($1::text)::text AS size", [databaseName]);
    const databaseSizeBytes = normalizedCount(sizeResult.rows[0]?.size, "database size");
    const durationMs = Math.max(0, dependencies.now().getTime() - startedAt.getTime());
    await recordVerified(admin, { databaseName, durationMs, migrationCount, tableCounts, databaseSizeBytes });
    await retainVerifiedDatabases(admin);
    logMetadata(dependencies, { event: "backup_verified", status: "verified", runId, databaseName, attempt, durationMs, migrationCount, tableCounts, databaseSizeBytes });
    return { status: "verified", databaseName, attempt, migrationCount, tableCounts, databaseSizeBytes };
  } catch (error) {
    await endQuietly(restored);
    await endQuietly(source);
    const durationMs = Math.max(0, dependencies.now().getTime() - startedAt.getTime());
    try {
      await recordFailed(admin, { databaseName, durationMs });
      if (created) await admin.query(`DROP DATABASE ${quoteRecoveryIdentifier(databaseName)}`);
    } finally {
      logMetadata(dependencies, { event: "backup_attempt_failed", status: "failed", runId, databaseName, attempt, durationMs, cleanupStatus: created ? "requested" : "not_created" });
    }
    throw error;
  } finally {
    if (tempDirectory) await dependencies.removeTempDirectory(tempDirectory);
  }
}

export async function runBackupWorker({ env = process.env, dependencies = createRuntimeDependencies() } = {}) {
  const config = loadBackupConfiguration(env);
  const runtime = { ...createRuntimeDependencies(), ...dependencies };
  const runId = config.runId ?? `${timestampSegment(runtime.now())}_${runtime.randomSuffix().slice(0, 12)}`;
  const admin = await runtime.createClient(config.recoveryAdmin);
  let locked = false;
  try {
    await admin.connect();
    const lock = await admin.query("SELECT pg_try_advisory_lock($1::bigint) AS acquired", [BACKUP_ADVISORY_LOCK_KEY]);
    locked = lock.rows[0]?.acquired === true;
    if (!locked) throw new Error("A backup job is already running.");
    await ensureMetadataTable(admin);
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        return await runSingleAttempt({ config, runId, attempt, admin, dependencies: runtime });
      } catch {
        if (attempt === 2) throw new Error("Backup could not be verified after two attempts.");
      }
    }
    throw new Error("Backup could not be verified.");
  } finally {
    if (locked) await admin.query("SELECT pg_advisory_unlock($1::bigint)", [BACKUP_ADVISORY_LOCK_KEY]);
    await admin.end();
  }
}
