import {
  BACKUP_ADVISORY_LOCK_KEY,
  createRecoveryDatabaseName,
  loadBackupConfiguration,
  normalizedCount,
  postgresChildEnvironment,
  quoteRecoveryIdentifier,
  selectExpiredRecoveryDatabases,
  timestampSegment,
  validateCriticalTablesAndCounts,
  validateMigrationParity,
} from "./backup-contract.mjs";
import { createRuntimeDependencies } from "./pg-runtime.mjs";

const LOG_FIELDS = new Set(["event", "status", "runId", "databaseName", "attempt", "durationMs", "migrationCount", "tableCounts", "databaseSizeBytes", "cleanupStatus", "warning", "errorCategory"]);
const MIGRATIONS = `SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count FROM public."_prisma_migrations" ORDER BY started_at ASC, migration_name ASC`;
const TABLES = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'";
const COUNTS = `SELECT 'User' AS table, count(*)::text AS count FROM public."User" UNION ALL SELECT 'Recipe', count(*)::text FROM public."Recipe" UNION ALL SELECT 'ShoppingCart', count(*)::text FROM public."ShoppingCart"`;

function log(dependencies, values) { dependencies.log(Object.fromEntries(Object.entries(values).filter(([key]) => LOG_FIELDS.has(key)))); }
async function settle(...tasks) { await Promise.allSettled(tasks.filter(Boolean).map((task) => task())); }
async function snapshot(client) {
  const [migrations, tables, counts] = await Promise.all([client.query(MIGRATIONS), client.query(TABLES), client.query(COUNTS)]);
  return { migrations: migrations.rows, tables: tables.rows.map((row) => row.table_name), counts: Object.fromEntries(counts.rows.map((row) => [row.table, row.count])) };
}
async function metadataTable(admin) {
  await admin.query(`CREATE TABLE IF NOT EXISTS preppie_backup_recovery_metadata (database_name text PRIMARY KEY, run_id text NOT NULL, attempt integer NOT NULL, status text NOT NULL, started_at timestamptz NOT NULL, completed_at timestamptz, duration_ms bigint, migration_count integer, table_counts jsonb, database_size_bytes bigint, verified_at timestamptz, quarantined_at timestamptz, error_category text)`);
}
async function quarantine(admin, databaseName, durationMs) {
  await admin.query("UPDATE preppie_backup_recovery_metadata SET status = 'quarantined', completed_at = NOW(), duration_ms = $2, quarantined_at = NOW(), error_category = 'attempt_failed' WHERE database_name = $1", [databaseName, String(durationMs)]);
}
async function retention(admin, dependencies, runId) {
  try {
    const rows = await admin.query(`SELECT database_name AS "databaseName", status, verified_at AS "verifiedAt" FROM preppie_backup_recovery_metadata WHERE status = 'verified'`);
    for (const database of selectExpiredRecoveryDatabases(rows.rows, 2)) {
      await admin.query("UPDATE preppie_backup_recovery_metadata SET status = 'deleting' WHERE database_name = $1 AND status = 'verified'", [database.databaseName]);
      await admin.query(`DROP DATABASE ${quoteRecoveryIdentifier(database.databaseName)}`);
      await admin.query("UPDATE preppie_backup_recovery_metadata SET status = 'deleted', completed_at = NOW() WHERE database_name = $1", [database.databaseName]);
    }
  } catch {
    log(dependencies, { event: "backup_retention_warning", status: "verified", runId, warning: "retention_deferred" });
  }
}
async function sourceSnapshot(source) {
  await source.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const exported = await source.query("SELECT pg_export_snapshot() AS snapshot_id");
  const snapshotId = exported.rows[0]?.snapshot_id;
  if (typeof snapshotId !== "string" || !snapshotId) throw new Error("Source snapshot could not be created.");
  return { snapshotId, validation: await snapshot(source) };
}
async function oneAttempt({ config, runId, attempt, admin, dependencies }) {
  const started = dependencies.now();
  const databaseName = createRecoveryDatabaseName({ runId: config.runId ?? runId, now: started, attempt, randomSuffix: dependencies.randomSuffix() });
  let source; let restored; let directory; let sourceTransaction = false; let verified = false;
  try {
    await admin.query("INSERT INTO preppie_backup_recovery_metadata (database_name, run_id, attempt, status, started_at) VALUES ($1, $2, $3, 'pending', NOW())", [databaseName, runId, attempt]);
    await admin.query(`CREATE DATABASE ${quoteRecoveryIdentifier(databaseName)}`);
    directory = await dependencies.createTempDirectory();
    source = await dependencies.createClient(config.source); await source.connect();
    sourceTransaction = true;
    const sourceState = await sourceSnapshot(source);
    const dumpPath = dependencies.makeDumpPath(directory, databaseName);
    await dependencies.runCommand("pg_dump", ["--format=custom", "--schema=public", "--no-owner", "--no-acl", `--snapshot=${sourceState.snapshotId}`, "--file", dumpPath], { env: postgresChildEnvironment(config.source, dependencies.processEnvironment), timeoutMs: 30 * 60_000 });
    await source.query("COMMIT"); sourceTransaction = false;
    restored = await dependencies.createClient({ ...config.recoveryAdmin, database: databaseName }); await restored.connect();
    await dependencies.runCommand("pg_restore", ["--exit-on-error", "--no-owner", "--no-acl", dumpPath], { env: postgresChildEnvironment({ ...config.recoveryAdmin, database: databaseName }, dependencies.processEnvironment), timeoutMs: 30 * 60_000 });
    const restoredState = await snapshot(restored);
    const { migrationCount } = validateMigrationParity(sourceState.validation.migrations, restoredState.migrations);
    const { tableCounts } = validateCriticalTablesAndCounts({ sourceTables: sourceState.validation.tables, restoredTables: restoredState.tables, sourceCounts: sourceState.validation.counts, restoredCounts: restoredState.counts });
    await settle(() => restored.end(), () => source.end()); restored = undefined; source = undefined;
    const size = await admin.query("SELECT pg_database_size($1::text)::text AS size", [databaseName]);
    const databaseSizeBytes = normalizedCount(size.rows[0]?.size, "database size");
    const durationMs = Math.max(0, dependencies.now().getTime() - started.getTime());
    await admin.query("UPDATE preppie_backup_recovery_metadata SET status = 'verified', completed_at = NOW(), duration_ms = $2, migration_count = $3, table_counts = $4::jsonb, database_size_bytes = $5, verified_at = NOW() WHERE database_name = $1", [databaseName, String(durationMs), migrationCount, JSON.stringify(tableCounts), databaseSizeBytes]);
    verified = true;
    log(dependencies, { event: "backup_verified", status: "verified", runId, databaseName, attempt, durationMs, migrationCount, tableCounts, databaseSizeBytes });
    await retention(admin, dependencies, runId);
    return { status: "verified", databaseName, attempt };
  } catch (error) {
    const durationMs = Math.max(0, dependencies.now().getTime() - started.getTime());
    if (!verified) {
      await settle(() => quarantine(admin, databaseName, durationMs));
      log(dependencies, { event: "backup_attempt_failed", status: "quarantined", runId, databaseName, attempt, durationMs, errorCategory: "attempt_failed" });
    }
    throw error;
  } finally {
    await settle(
      sourceTransaction && source ? () => source.query("ROLLBACK") : undefined,
      restored ? () => restored.end() : undefined,
      source ? () => source.end() : undefined,
      directory ? () => dependencies.removeTempDirectory(directory) : undefined,
    );
  }
}
export async function runBackupWorker({ env = process.env, dependencies = createRuntimeDependencies() } = {}) {
  const config = loadBackupConfiguration(env); const runtime = { ...createRuntimeDependencies(), ...dependencies };
  const runId = config.runId ?? `${timestampSegment(runtime.now())}_${runtime.randomSuffix().slice(0, 12)}`;
  const admin = await runtime.createClient(config.recoveryAdmin); let locked = false;
  try {
    await admin.connect();
    const lock = await admin.query("SELECT pg_try_advisory_lock($1::bigint) AS acquired", [BACKUP_ADVISORY_LOCK_KEY]);
    locked = lock.rows[0]?.acquired === true;
    if (!locked) throw new Error("A backup job is already running.");
    await metadataTable(admin);
    let primary;
    for (let attempt = 1; attempt <= 2; attempt += 1) { try { return await oneAttempt({ config, runId, attempt, admin, dependencies: runtime }); } catch (error) { primary = error; } }
    throw new Error("Backup could not be verified after two attempts.");
  } finally {
    await settle(locked ? () => admin.query("SELECT pg_advisory_unlock($1::bigint)", [BACKUP_ADVISORY_LOCK_KEY]) : undefined, () => admin.end());
  }
}
