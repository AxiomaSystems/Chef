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
const RUN_DEADLINE_MS = 30 * 60_000;
const ATTEMPT_RESERVE_MS = 15 * 60_000;

function log(dependencies, values) {
  try {
    const result = dependencies.log(Object.fromEntries(Object.entries(values).filter(([key]) => LOG_FIELDS.has(key))));
    if (result?.catch) result.catch(() => {});
  } catch {}
}
async function sequentialCleanup(tasks, primaryError, dependencies, context) {
  let cleanupError;
  for (const task of tasks) {
    if (!task) continue;
    try { await task(); } catch (error) { cleanupError ??= error; }
  }
  if (!cleanupError) return;
  if (primaryError) {
    log(dependencies, { event: "backup_cleanup_warning", status: "failed", warning: context });
    return;
  }
  throw cleanupError;
}
async function snapshot(client) {
  const [migrations, tables, counts] = await Promise.all([client.query(MIGRATIONS), client.query(TABLES), client.query(COUNTS)]);
  return { migrations: migrations.rows, tables: tables.rows.map((row) => row.table_name), counts: Object.fromEntries(counts.rows.map((row) => [row.table, row.count])) };
}
async function metadataTable(admin) {
  await admin.query(`CREATE TABLE IF NOT EXISTS preppie_backup_recovery_metadata (database_name text PRIMARY KEY, run_id text NOT NULL, attempt integer NOT NULL, status text NOT NULL, started_at timestamptz NOT NULL, completed_at timestamptz, duration_ms bigint, migration_count integer, table_counts jsonb, database_size_bytes bigint, verified_at timestamptz, quarantined_at timestamptz, error_category text)`);
}
async function quarantine(admin, databaseName, durationMs) {
  const result = await admin.query("UPDATE preppie_backup_recovery_metadata SET status = 'quarantined', completed_at = NOW(), duration_ms = $2, quarantined_at = NOW(), error_category = 'attempt_failed' WHERE database_name = $1 AND status = 'pending' RETURNING database_name", [databaseName, String(durationMs)]);
  if (result.rowCount !== 1 && result.rows?.length !== 1) throw new Error("Quarantine metadata transition was not confirmed.");
}
async function markNotCreated(admin, databaseName, durationMs) {
  const result = await admin.query("UPDATE preppie_backup_recovery_metadata SET status = 'failed_not_created', completed_at = NOW(), duration_ms = $2, error_category = 'create_database_failed' WHERE database_name = $1 AND status = 'pending' RETURNING database_name", [databaseName, String(durationMs)]);
  if (result.rowCount !== 1 && result.rows?.length !== 1) throw new Error("Failed-not-created metadata transition was not confirmed.");
}
async function retention(admin, dependencies, runId) {
  try {
    const rows = await admin.query(`SELECT database_name AS "databaseName", status, verified_at AS "verifiedAt" FROM preppie_backup_recovery_metadata WHERE status = 'verified'`);
    for (const database of selectExpiredRecoveryDatabases(rows.rows, 2)) {
      const transition = await admin.query("UPDATE preppie_backup_recovery_metadata SET status = 'deleting' WHERE database_name = $1 AND status = 'verified' RETURNING database_name", [database.databaseName]);
      if (transition.rowCount !== 1 && transition.rows?.length !== 1) throw new Error("Retention metadata transition was not confirmed.");
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
async function oneAttempt({ config, runId, attempt, admin, dependencies, deadlineAt }) {
  const started = dependencies.now();
  const databaseName = createRecoveryDatabaseName({ runId: config.runId ?? runId, now: started, attempt, randomSuffix: dependencies.randomSuffix() });
  let source; let restored; let directory; let sourceTransaction = false; let verified = false; let created = false; let metadataInserted = false; let primaryError;
  const attemptDeadline = Math.min(deadlineAt, started.getTime() + ATTEMPT_RESERVE_MS);
  const remaining = () => {
    const budget = attemptDeadline - dependencies.now().getTime();
    if (budget <= 0) throw new Error("Backup retry deadline exceeded.");
    return budget;
  };
  try {
    remaining();
    await admin.query("INSERT INTO preppie_backup_recovery_metadata (database_name, run_id, attempt, status, started_at) VALUES ($1, $2, $3, 'pending', NOW())", [databaseName, runId, attempt]);
    metadataInserted = true;
    await admin.query(`CREATE DATABASE ${quoteRecoveryIdentifier(databaseName)}`);
    created = true;
    directory = await dependencies.createTempDirectory();
    source = await dependencies.createClient(config.source); await source.connect();
    sourceTransaction = true;
    const sourceState = await sourceSnapshot(source);
    const dumpPath = dependencies.makeDumpPath(directory, databaseName);
    await dependencies.runCommand("pg_dump", ["--format=custom", "--schema=public", "--no-owner", "--no-acl", `--snapshot=${sourceState.snapshotId}`, "--file", dumpPath], { env: postgresChildEnvironment(config.source, dependencies.processEnvironment), timeoutMs: remaining() });
    await source.query("COMMIT"); sourceTransaction = false;
    restored = await dependencies.createClient({ ...config.recoveryAdmin, database: databaseName }); await restored.connect();
    await dependencies.runCommand("pg_restore", ["--exit-on-error", "--no-owner", "--no-acl", dumpPath], { env: postgresChildEnvironment({ ...config.recoveryAdmin, database: databaseName }, dependencies.processEnvironment), timeoutMs: remaining() });
    const restoredState = await snapshot(restored);
    const { migrationCount } = validateMigrationParity(sourceState.validation.migrations, restoredState.migrations);
    const { tableCounts } = validateCriticalTablesAndCounts({ sourceTables: sourceState.validation.tables, restoredTables: restoredState.tables, sourceCounts: sourceState.validation.counts, restoredCounts: restoredState.counts });
    await sequentialCleanup([() => restored.end(), () => source.end()], undefined, dependencies, "client_close_failed"); restored = undefined; source = undefined;
    const size = await admin.query("SELECT pg_database_size($1::text)::text AS size", [databaseName]);
    const databaseSizeBytes = normalizedCount(size.rows[0]?.size, "database size");
    const durationMs = Math.max(0, dependencies.now().getTime() - started.getTime());
    const verifiedTransition = await admin.query("UPDATE preppie_backup_recovery_metadata SET status = 'verified', completed_at = NOW(), duration_ms = $2, migration_count = $3, table_counts = $4::jsonb, database_size_bytes = $5, verified_at = NOW() WHERE database_name = $1 AND status = 'pending' RETURNING database_name", [databaseName, String(durationMs), migrationCount, JSON.stringify(tableCounts), databaseSizeBytes]);
    if (verifiedTransition.rowCount !== 1 && verifiedTransition.rows?.length !== 1) throw new Error("Verification metadata transition was not confirmed.");
    verified = true;
    log(dependencies, { event: "backup_verified", status: "verified", runId, databaseName, attempt, durationMs, migrationCount, tableCounts, databaseSizeBytes });
    await retention(admin, dependencies, runId);
    return { status: "verified", databaseName, attempt };
  } catch (error) {
    primaryError = error;
    const durationMs = Math.max(0, dependencies.now().getTime() - started.getTime());
    if (!verified && created) {
      try {
        await quarantine(admin, databaseName, durationMs);
        log(dependencies, { event: "backup_attempt_failed", status: "quarantined", runId, databaseName, attempt, durationMs, errorCategory: "attempt_failed" });
      } catch {
        log(dependencies, { event: "backup_quarantine_warning", status: "failed", runId, databaseName, attempt, warning: "quarantine_failed" });
      }
    } else if (!verified && metadataInserted) {
      try {
        await markNotCreated(admin, databaseName, durationMs);
        log(dependencies, { event: "backup_attempt_failed", status: "failed_not_created", runId, databaseName, attempt, durationMs, errorCategory: "create_database_failed" });
      } catch {
        log(dependencies, { event: "backup_failed_not_created_warning", status: "failed", runId, databaseName, attempt, warning: "failed_not_created_transition_failed" });
      }
    }
    throw error;
  } finally {
    await sequentialCleanup([
      sourceTransaction && source ? () => source.query("ROLLBACK") : undefined,
      restored ? () => restored.end() : undefined,
      source ? () => source.end() : undefined,
      directory ? () => dependencies.removeTempDirectory(directory) : undefined,
    ], primaryError, dependencies, "attempt_cleanup_failed");
  }
}
export async function runBackupWorker({ env = process.env, dependencies = createRuntimeDependencies() } = {}) {
  const config = loadBackupConfiguration(env); const runtime = { ...createRuntimeDependencies(), ...dependencies };
  const runId = config.runId ?? `${timestampSegment(runtime.now())}_${runtime.randomSuffix().slice(0, 12)}`;
  const admin = await runtime.createClient(config.recoveryAdmin); let locked = false; let primaryError;
  const deadlineAt = runtime.now().getTime() + RUN_DEADLINE_MS;
  try {
    await admin.connect();
    const lock = await admin.query("SELECT pg_try_advisory_lock($1::bigint) AS acquired", [BACKUP_ADVISORY_LOCK_KEY]);
    locked = lock.rows[0]?.acquired === true;
    if (!locked) throw new Error("A backup job is already running.");
    await metadataTable(admin);
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      if (runtime.now().getTime() >= deadlineAt) throw new Error("Backup retry deadline exceeded.");
      try { return await oneAttempt({ config, runId, attempt, admin, dependencies: runtime, deadlineAt }); } catch {}
    }
    throw new Error("Backup could not be verified after two attempts.");
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    await sequentialCleanup([locked ? () => admin.query("SELECT pg_advisory_unlock($1::bigint)", [BACKUP_ADVISORY_LOCK_KEY]) : undefined, () => admin.end()], primaryError, runtime, "admin_cleanup_failed");
  }
}
