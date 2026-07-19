import {
  createRehearsalEvidence,
  loadBackupConfiguration,
  normalizedCount,
  parseIsolatedHttpsOrigin,
  quoteResolvedRehearsalIdentifier,
  resolveRehearsalTarget,
  createRuntimeDependencies,
  validateCriticalTablesAndCounts,
  validateMigrationParity,
} from "../apps/database-backup/src/backup.mjs";

const MIGRATIONS = `SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count FROM public."_prisma_migrations" ORDER BY started_at ASC, migration_name ASC`;
const TABLES =
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'";
const COUNTS = `SELECT 'User' AS table, count(*)::text AS count FROM public."User" UNION ALL SELECT 'BaseRecipe', count(*)::text FROM public."BaseRecipe" UNION ALL SELECT 'ShoppingCart', count(*)::text FROM public."ShoppingCart"`;
const runtime = createRuntimeDependencies();
let failureCategory = "rehearsal_command_failed";

function fail(message) {
  throw new Error(message);
}

function requireResolvedTarget(attemptOneName, databaseName) {
  const resolution = resolveRehearsalTarget(attemptOneName);
  quoteResolvedRehearsalIdentifier(databaseName, resolution);
  return resolution;
}

async function createClient(config) {
  return runtime.createClient(config);
}

async function snapshot(client) {
  const migrations = await client.query(MIGRATIONS);
  const tables = await client.query(TABLES);
  const counts = await client.query(COUNTS);
  return {
    migrations: migrations.rows,
    tables: tables.rows.map((row) => row.table_name),
    counts: Object.fromEntries(
      counts.rows.map((row) => [row.table, row.count]),
    ),
  };
}

async function inspect(attemptOneName, databaseName) {
  failureCategory = "inspect_target_failed";
  const resolution = requireResolvedTarget(attemptOneName, databaseName);
  const config = loadBackupConfiguration(process.env);
  if (config.runId !== resolution.runId)
    fail("BACKUP_RUN_ID does not match rehearsal target.");

  const source = await createClient(config.source);
  const restored = await createClient({
    ...config.recoveryAdmin,
    database: databaseName,
  });
  const admin = await createClient(config.recoveryAdmin);
  try {
    failureCategory = "inspect_connection_failed";
    await source.connect();
    await restored.connect();
    await admin.connect();
    failureCategory = "inspect_snapshot_failed";
    const [sourceState, restoredState] = await Promise.all([
      snapshot(source),
      snapshot(restored),
    ]);
    failureCategory = "inspect_parity_failed";
    const { migrationCount } = validateMigrationParity(
      sourceState.migrations,
      restoredState.migrations,
    );
    const { tableCounts } = validateCriticalTablesAndCounts({
      sourceTables: sourceState.tables,
      restoredTables: restoredState.tables,
      sourceCounts: sourceState.counts,
      restoredCounts: restoredState.counts,
    });
    failureCategory = "inspect_metadata_failed";
    const metadata = await admin.query(
      "SELECT status, migration_count, table_counts, database_size_bytes FROM preppie_backup_recovery_metadata WHERE database_name = $1 AND run_id = $2",
      [databaseName, resolution.runId],
    );
    if (metadata.rows.length !== 1 || metadata.rows[0].status !== "verified") {
      fail("Rehearsal target is not verified in backup metadata.");
    }
    const databaseSizeBytes = normalizedCount(
      metadata.rows[0].database_size_bytes,
      "database size",
    );
    if (
      Number(metadata.rows[0].migration_count) !== migrationCount ||
      Object.entries(tableCounts).some(
        ([table, count]) =>
          String(metadata.rows[0].table_counts?.[table]) !== count,
      )
    ) {
      fail("Rehearsal metadata does not match restored validation.");
    }
    failureCategory = "inspect_result_failed";
    return {
      databaseName,
      sourceLatestMigration:
        sourceState.migrations.at(-1)?.migration_name ?? undefined,
      restoredLatestMigration:
        restoredState.migrations.at(-1)?.migration_name ?? undefined,
      migrationCount,
      databaseSizeBytes,
      tableCounts,
    };
  } finally {
    await Promise.allSettled([source.end(), restored.end(), admin.end()]);
  }
}

async function cleanup(attemptOneName, databaseName) {
  const resolution = requireResolvedTarget(attemptOneName, databaseName);
  const config = loadBackupConfiguration(process.env);
  if (config.runId !== resolution.runId)
    fail("BACKUP_RUN_ID does not match rehearsal target.");
  const admin = await createClient(config.recoveryAdmin);
  try {
    await admin.connect();
    const current = await admin.query(
      "SELECT status FROM preppie_backup_recovery_metadata WHERE database_name = $1 AND run_id = $2",
      [databaseName, resolution.runId],
    );
    if (
      current.rows.length === 0 ||
      ["deleted", "failed_not_created"].includes(current.rows[0].status)
    ) {
      return { status: "skipped", databaseName };
    }
    if (!["verified", "quarantined"].includes(current.rows[0].status)) {
      fail("Cleanup requires a verified or quarantined rehearsal database.");
    }
    const transition = await admin.query(
      "UPDATE preppie_backup_recovery_metadata SET status = 'deleting' WHERE database_name = $1 AND run_id = $2 AND status = $3 RETURNING database_name",
      [databaseName, resolution.runId, current.rows[0].status],
    );
    if (transition.rowCount !== 1) {
      fail("Cleanup requires one explicitly verified rehearsal database.");
    }
    await admin.query(
      `DROP DATABASE ${quoteResolvedRehearsalIdentifier(databaseName, resolution)}`,
    );
    const deleted = await admin.query(
      "UPDATE preppie_backup_recovery_metadata SET status = 'deleted', completed_at = NOW() WHERE database_name = $1 AND run_id = $2 AND status = 'deleting' RETURNING database_name",
      [databaseName, resolution.runId],
    );
    if (deleted.rowCount !== 1)
      fail("Cleanup metadata transition was not confirmed.");
    return { status: "deleted", databaseName };
  } finally {
    await admin.end();
  }
}

async function main() {
  const [command, attemptOneName, databaseName] = process.argv.slice(2);
  if (command === "resolve") return resolveRehearsalTarget(attemptOneName);
  if (command === "origin-env") {
    if (!/^[A-Z][A-Z0-9_]*$/.test(attemptOneName ?? "")) {
      fail("Origin environment variable name is invalid.");
    }
    return { origin: parseIsolatedHttpsOrigin(process.env[attemptOneName]) };
  }
  if (command === "evidence-env") {
    const serialized = process.env.REHEARSAL_EVIDENCE_JSON;
    if (typeof serialized !== "string" || serialized.length > 16_384) {
      fail("Rehearsal evidence input is invalid.");
    }
    return createRehearsalEvidence(JSON.parse(serialized));
  }
  if (command === "inspect") return inspect(attemptOneName, databaseName);
  if (command === "cleanup") return cleanup(attemptOneName, databaseName);
  fail("Unknown recovery rehearsal command.");
}

try {
  console.log(JSON.stringify(await main()));
} catch {
  console.error(
    JSON.stringify({ status: "failed", errorCategory: failureCategory }),
  );
  process.exitCode = 1;
}
