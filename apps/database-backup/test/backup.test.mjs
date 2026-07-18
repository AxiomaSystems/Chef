import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKUP_ADVISORY_LOCK_KEY,
  createRecoveryDatabaseName,
  loadBackupConfiguration,
  quoteRecoveryIdentifier,
  redactUrlLikeContent,
  runBackupWorker,
  selectExpiredRecoveryDatabases,
  validateCriticalTablesAndCounts,
  validateMigrationParity,
} from "../src/backup.mjs";

const sourceUrl = "postgresql://source_user:source_secret@source.example:5432/source_db?sslmode=require";
const recoveryUrl = "postgresql://recovery_user:recovery_secret@recovery.example:5432/recovery_admin?sslmode=require";

function validMigrations() {
  return [
    {
      migration_name: "20260717170000_add_database_release_compatibility",
      checksum: "a".repeat(64),
      finished_at: new Date("2026-07-17T17:00:00.000Z"),
      rolled_back_at: null,
      applied_steps_count: 1,
    },
  ];
}

function validValidationInput() {
  return {
    sourceTables: ["User", "Recipe", "ShoppingCart", "_prisma_migrations"],
    restoredTables: ["User", "Recipe", "ShoppingCart", "_prisma_migrations"],
    sourceCounts: { User: "2", Recipe: "3", ShoppingCart: "4" },
    restoredCounts: { User: "2", Recipe: "3", ShoppingCart: "4" },
  };
}

test("recovery names and SQL identifiers are generated and guarded strictly", () => {
  const name = createRecoveryDatabaseName({
    runId: "nightly_01",
    now: new Date("2026-07-17T02:00:00.000Z"),
    attempt: 1,
  });

  assert.match(name, /^preppie_recovery_[a-z0-9_]+$/);
  assert.equal(quoteRecoveryIdentifier(name), `"${name}"`);
  assert.throws(() => createRecoveryDatabaseName({ runId: "not-safe!" }));
  assert.throws(() => quoteRecoveryIdentifier("preppie_recovery_x;drop database postgres"));
  assert.throws(() => quoteRecoveryIdentifier("postgres"));
});

test("configuration converts URLs into client configuration without returning connection strings", () => {
  const config = loadBackupConfiguration({
    SOURCE_DATABASE_URL: sourceUrl,
    RECOVERY_ADMIN_DATABASE_URL: recoveryUrl,
    BACKUP_RUN_ID: "nightly_01",
  });

  assert.deepEqual(config.source, {
    host: "source.example",
    port: 5432,
    database: "source_db",
    user: "source_user",
    password: "source_secret",
    ssl: { rejectUnauthorized: false },
  });
  assert.equal(JSON.stringify(config).includes(sourceUrl), false);
  assert.throws(() => loadBackupConfiguration({ SOURCE_DATABASE_URL: sourceUrl }));
  assert.throws(() => loadBackupConfiguration({
    SOURCE_DATABASE_URL: "https://example.test/not-postgres",
    RECOVERY_ADMIN_DATABASE_URL: recoveryUrl,
  }));
});

test("redacts URL-like error content before it can be logged", () => {
  const message = redactUrlLikeContent(`pg_dump failed for ${sourceUrl} and https://example.test/path`);
  assert.equal(message.includes("source_secret"), false);
  assert.equal(message.includes("https://example.test/path"), false);
  assert.match(message, /\[REDACTED_URL\]/);
});

test("requires complete, unique and matching active Prisma migration histories", () => {
  assert.deepEqual(validateMigrationParity(validMigrations(), validMigrations()), { migrationCount: 1 });
  assert.throws(() => validateMigrationParity(validMigrations(), [{ ...validMigrations()[0], checksum: "b".repeat(64) }]));
  assert.throws(() => validateMigrationParity(validMigrations(), [{ ...validMigrations()[0], finished_at: null }]));
  assert.throws(() => validateMigrationParity(validMigrations(), [validMigrations()[0], validMigrations()[0]]));
});

test("requires critical public tables and exactly matching critical row counts", () => {
  assert.deepEqual(validateCriticalTablesAndCounts(validValidationInput()), {
    tableCounts: { User: "2", Recipe: "3", ShoppingCart: "4" },
  });
  assert.throws(() => validateCriticalTablesAndCounts({
    ...validValidationInput(),
    restoredTables: ["User", "Recipe", "ShoppingCart"],
  }));
  assert.throws(() => validateCriticalTablesAndCounts({
    ...validValidationInput(),
    restoredCounts: { User: "2", Recipe: "999", ShoppingCart: "4" },
  }));
});

test("retention keeps the two newest verified recovery databases and never selects failed copies", () => {
  const expired = selectExpiredRecoveryDatabases([
    { databaseName: "preppie_recovery_new", status: "verified", verifiedAt: "2026-07-17T02:00:00.000Z" },
    { databaseName: "preppie_recovery_mid", status: "verified", verifiedAt: "2026-07-16T02:00:00.000Z" },
    { databaseName: "preppie_recovery_old", status: "verified", verifiedAt: "2026-07-15T02:00:00.000Z" },
    { databaseName: "preppie_recovery_failed", status: "failed", verifiedAt: "2026-07-14T02:00:00.000Z" },
  ]);

  assert.deepEqual(expired.map((database) => database.databaseName), ["preppie_recovery_old"]);
});

function createSuccessfulDependencies(events) {
  const migrations = validMigrations();
  const validation = validValidationInput();
  const admin = {
    async connect() { events.push("admin.connect"); },
    async end() { events.push("admin.end"); },
    async query(sql, params = []) {
      events.push({ sql, params });
      if (sql.includes("pg_try_advisory_lock")) return { rows: [{ acquired: true }] };
      if (sql.includes("pg_database_size")) return { rows: [{ size: "8192" }] };
      if (sql.includes("FROM preppie_backup_recovery_metadata") && sql.includes("status = 'verified'")) {
        return { rows: [] };
      }
      return { rows: [] };
    },
  };
  const source = {
    async connect() { events.push("source.connect"); },
    async end() { events.push("source.end"); },
    async query(sql) {
      if (sql.includes("_prisma_migrations")) return { rows: migrations };
      if (sql.includes("information_schema.tables")) return { rows: validation.sourceTables.map((table_name) => ({ table_name })) };
      return { rows: Object.entries(validation.sourceCounts).map(([table, count]) => ({ table, count })) };
    },
  };
  const restored = {
    async connect() { events.push("restored.connect"); },
    async end() { events.push("restored.end"); },
    async query(sql) {
      if (sql.includes("_prisma_migrations")) return { rows: migrations };
      if (sql.includes("information_schema.tables")) return { rows: validation.restoredTables.map((table_name) => ({ table_name })) };
      return { rows: Object.entries(validation.restoredCounts).map(([table, count]) => ({ table, count })) };
    },
  };
  return {
    createClient(config) {
      if (config.host === "recovery.example" && config.database === "recovery_admin") return admin;
      if (config.host === "source.example") return source;
      return restored;
    },
    async runCommand(command, args, options) {
      events.push({ command, args, env: options.env });
    },
    async createTempDirectory() { return "/tmp/preppie-backup-test"; },
    async removeTempDirectory(path) { events.push({ cleanup: path }); },
    makeDumpPath(directory, databaseName) { return `${directory}/${databaseName}.dump`; },
    now: () => new Date("2026-07-17T02:00:00.000Z"),
    randomSuffix: () => "random_01",
    log(metadata) { events.push({ log: metadata }); },
  };
}

test("orchestration holds the bigint advisory lock, verifies once, logs only metadata, and cleans up", async () => {
  const events = [];
  const result = await runBackupWorker({
    env: { SOURCE_DATABASE_URL: sourceUrl, RECOVERY_ADMIN_DATABASE_URL: recoveryUrl, BACKUP_RUN_ID: "nightly_01" },
    dependencies: createSuccessfulDependencies(events),
  });

  assert.equal(result.status, "verified");
  const lock = events.find((event) => event.sql?.includes("pg_try_advisory_lock"));
  assert.deepEqual(lock.params, [BACKUP_ADVISORY_LOCK_KEY]);
  assert.equal(typeof lock.params[0], "string");
  assert.equal(events.filter((event) => event.command === "pg_dump").length, 1);
  assert.equal(events.filter((event) => event.command === "pg_restore").length, 1);
  assert.ok(events.some((event) => event.cleanup === "/tmp/preppie-backup-test"));
  assert.ok(events.some((event) => event.sql?.includes("pg_advisory_unlock")));
  for (const event of events.filter((event) => event.log)) {
    assert.equal(JSON.stringify(event).includes("source_secret"), false);
    assert.equal(JSON.stringify(event).includes(sourceUrl), false);
  }
});

test("orchestration retries at most once and preserves prior verified copies after failures", async () => {
  const events = [];
  const dependencies = createSuccessfulDependencies(events);
  let restores = 0;
  dependencies.runCommand = async (command, args, options) => {
    events.push({ command, args, env: options.env });
    if (command === "pg_restore" && restores++ === 0) throw new Error(`restore ${sourceUrl}`);
  };

  const result = await runBackupWorker({
    env: { SOURCE_DATABASE_URL: sourceUrl, RECOVERY_ADMIN_DATABASE_URL: recoveryUrl, BACKUP_RUN_ID: "nightly_01" },
    dependencies,
  });

  assert.equal(result.status, "verified");
  assert.equal(events.filter((event) => event.command === "pg_restore").length, 2);
  assert.equal(events.some((event) => event.sql?.startsWith('DROP DATABASE "preppie_recovery_old"')), false);
  assert.equal(events.filter((event) => event.sql?.startsWith("DROP DATABASE")).length, 1);
});
