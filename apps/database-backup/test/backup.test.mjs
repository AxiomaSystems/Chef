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

  assert.deepEqual(
    { host: config.source.host, port: config.source.port, database: config.source.database, user: config.source.user, password: config.source.password, ssl: config.source.ssl, sslMode: config.source.sslMode },
    { host: "source.example", port: 5432, database: "source_db", user: "source_user", password: "source_secret", ssl: { rejectUnauthorized: false }, sslMode: "require" },
  );
  assert.equal(JSON.stringify(config).includes(sourceUrl), false);
  assert.throws(() => loadBackupConfiguration({ SOURCE_DATABASE_URL: sourceUrl }));
  assert.throws(() => loadBackupConfiguration({
    SOURCE_DATABASE_URL: "https://example.test/not-postgres",
    RECOVERY_ADMIN_DATABASE_URL: recoveryUrl,
  }));
  assert.throws(() => loadBackupConfiguration({
    SOURCE_DATABASE_URL: "postgresql://source_user:source_secret@source.example/source_db?sslmode=no-verify",
    RECOVERY_ADMIN_DATABASE_URL: recoveryUrl,
  }));
  assert.throws(() => loadBackupConfiguration({
    SOURCE_DATABASE_URL: "postgresql://source_user:source_secret@source.example/source_db?sslmode=bogus",
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
      if (sql.includes("RETURNING database_name")) return { rows: [{ database_name: "ok" }], rowCount: 1 };
      if (sql.includes("FROM preppie_backup_recovery_metadata") && sql.includes("status = 'verified'")) {
        return { rows: [{ databaseName: "preppie_recovery_previous", status: "verified", verifiedAt: "2026-07-16T00:00:00.000Z" }] };
      }
      return { rows: [] };
    },
  };
  const source = {
    async connect() { events.push("source.connect"); },
    async end() { events.push("source.end"); },
    async query(sql) {
      events.push({ sql });
      if (sql.includes("pg_export_snapshot")) return { rows: [{ snapshot_id: "00000001-00000001-1" }] };
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
    admin,
    createClient(config) {
      if (config.host === "recovery.example" && config.database === "recovery_admin") return admin;
      if (config.host === "source.example") return source;
      return restored;
    },
    async runCommand(command, args, options) {
      events.push({ command, args, env: options.env, timeoutMs: options.timeoutMs });
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
  const dump = events.find((event) => event.command === "pg_dump");
  const restore = events.find((event) => event.command === "pg_restore");
  assert.deepEqual(dump.args.slice(0, 4), ["--format=custom", "--schema=public", "--no-owner", "--no-acl"]);
  assert.match(dump.args[4], /^--snapshot=/);
  assert.equal(dump.args[5], "--file");
  assert.deepEqual(restore.args.slice(0, 3), ["--exit-on-error", "--no-owner", "--no-acl"]);
  assert.equal(restore.args.length, 4);
  assert.match(restore.args.at(-1), /\.dump$/);
  assert.equal(dump.env.PGSSLMODE, "require");
  assert.equal(dump.timeoutMs, 15 * 60_000);
  assert.deepEqual(Object.keys(dump.env).sort(), ["PATH", "PGDATABASE", "PGHOST", "PGPASSWORD", "PGPORT", "PGSSLMODE", "PGUSER"].sort());
  assert.ok(events.some((event) => event.sql?.includes("pg_export_snapshot")));
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
    events.push({ command, args, env: options.env, timeoutMs: options.timeoutMs });
    if (command === "pg_restore" && restores++ === 0) throw new Error(`restore ${sourceUrl}`);
  };

  const result = await runBackupWorker({
    env: { SOURCE_DATABASE_URL: sourceUrl, RECOVERY_ADMIN_DATABASE_URL: recoveryUrl, BACKUP_RUN_ID: "nightly_01" },
    dependencies,
  });

  assert.equal(result.status, "verified");
  assert.equal(events.filter((event) => event.command === "pg_restore").length, 2);
  assert.ok(events.filter((event) => event.command).every((event) => event.timeoutMs <= 30 * 60_000));
  assert.equal(events.some((event) => event.sql?.startsWith('DROP DATABASE "preppie_recovery_old"')), false);
  assert.equal(events.filter((event) => event.sql?.startsWith("DROP DATABASE")).length, 0);
  assert.ok(events.some((event) => event.sql?.includes("status = 'quarantined'")));
});

test("both failed attempts are quarantined without dropping either target", async () => {
  const events = [];
  const dependencies = createSuccessfulDependencies(events);
  dependencies.runCommand = async (command, args, options) => {
    events.push({ command, args, env: options.env, timeoutMs: options.timeoutMs });
    throw new Error("dump failed");
  };
  await assert.rejects(() => runBackupWorker({
    env: { SOURCE_DATABASE_URL: sourceUrl, RECOVERY_ADMIN_DATABASE_URL: recoveryUrl, BACKUP_RUN_ID: "nightly_01" },
    dependencies,
  }), /could not be verified/);
  assert.equal(events.filter((event) => event.command === "pg_dump").length, 2);
  assert.equal(events.filter((event) => event.sql?.includes("status = 'quarantined'")).length, 2);
  assert.equal(events.filter((event) => event.sql?.startsWith("DROP DATABASE")).length, 0);
});

test("lock contention exits without creating a recovery database", async () => {
  const events = [];
  const admin = {
    async connect() { events.push("connect"); },
    async end() { events.push("end"); },
    async query(sql) { events.push({ sql }); return { rows: [{ acquired: false }] }; },
  };
  await assert.rejects(() => runBackupWorker({
    env: { SOURCE_DATABASE_URL: sourceUrl, RECOVERY_ADMIN_DATABASE_URL: recoveryUrl },
    dependencies: { createClient: () => admin, now: () => new Date(), randomSuffix: () => "safe", log() {} },
  }), /already running/);
  assert.equal(events.some((event) => event.sql?.startsWith("CREATE DATABASE")), false);
  assert.ok(events.includes("end"));
});

test("a successful retry surfaces unlock or admin-close cleanup failures, not stale attempt errors", async () => {
  const events = [];
  const dependencies = createSuccessfulDependencies(events);
  let restores = 0;
  dependencies.runCommand = async (command, args, options) => {
    events.push({ command, args, env: options.env, timeoutMs: options.timeoutMs });
    if (command === "pg_restore" && restores++ === 0) throw new Error("first attempt failed");
  };
  const originalQuery = dependencies.admin.query.bind(dependencies.admin);
  dependencies.admin.query = async (sql, params) => {
    if (sql.includes("pg_advisory_unlock")) throw new Error("unlock failed");
    return originalQuery(sql, params);
  };
  await assert.rejects(() => runBackupWorker({
    env: { SOURCE_DATABASE_URL: sourceUrl, RECOVERY_ADMIN_DATABASE_URL: recoveryUrl, BACKUP_RUN_ID: "nightly_01" }, dependencies,
  }), /unlock failed/);
  assert.equal(events.filter((event) => event.command === "pg_restore").length, 2);
});

test("deadline exhaustion prevents an attempt before recovery side effects", async () => {
  const events = [];
  const dependencies = createSuccessfulDependencies(events);
  const times = ["2026-07-17T00:00:00.000Z", "2026-07-17T00:00:00.000Z", "2026-07-17T00:30:00.000Z"];
  dependencies.now = () => new Date(times.shift() ?? "2026-07-17T00:30:00.000Z");
  await assert.rejects(() => runBackupWorker({
    env: { SOURCE_DATABASE_URL: sourceUrl, RECOVERY_ADMIN_DATABASE_URL: recoveryUrl }, dependencies,
  }), /deadline exceeded/);
  assert.equal(events.some((event) => event.sql?.startsWith("CREATE DATABASE")), false);
});

test("logger failures are best effort and do not replace verified or primary outcomes", async () => {
  const dependencies = createSuccessfulDependencies([]);
  dependencies.log = () => { throw new Error("logger failed"); };
  const result = await runBackupWorker({
    env: { SOURCE_DATABASE_URL: sourceUrl, RECOVERY_ADMIN_DATABASE_URL: recoveryUrl, BACKUP_RUN_ID: "nightly_01" }, dependencies,
  });
  assert.equal(result.status, "verified");
});

test("verification metadata requires the pending transition before declaring success", async () => {
  const events = [];
  const dependencies = createSuccessfulDependencies(events);
  const originalQuery = dependencies.admin.query.bind(dependencies.admin);
  dependencies.admin.query = async (sql, params) => {
    if (sql.includes("status = 'verified'") && sql.includes("RETURNING database_name")) return { rows: [], rowCount: 0 };
    return originalQuery(sql, params);
  };
  await assert.rejects(() => runBackupWorker({
    env: { SOURCE_DATABASE_URL: sourceUrl, RECOVERY_ADMIN_DATABASE_URL: recoveryUrl, BACKUP_RUN_ID: "nightly_01" }, dependencies,
  }), /could not be verified/);
  assert.equal(events.some((event) => event.log?.status === "verified"), false);
});

test("a database creation failure records failed_not_created instead of a quarantine", async () => {
  const events = [];
  const dependencies = createSuccessfulDependencies(events);
  const originalQuery = dependencies.admin.query.bind(dependencies.admin);
  dependencies.admin.query = async (sql, params) => {
    if (sql.startsWith("CREATE DATABASE")) throw new Error("create failed");
    return originalQuery(sql, params);
  };
  await assert.rejects(() => runBackupWorker({ env: { SOURCE_DATABASE_URL: sourceUrl, RECOVERY_ADMIN_DATABASE_URL: recoveryUrl }, dependencies }));
  assert.ok(events.some((event) => event.sql?.includes("failed_not_created")));
  assert.equal(events.some((event) => event.sql?.includes("status = 'quarantined'")), false);
});

test("retention confirms deleting before dropping and records deleted", async () => {
  const events = [];
  const dependencies = createSuccessfulDependencies(events);
  const originalQuery = dependencies.admin.query.bind(dependencies.admin);
  dependencies.admin.query = async (sql, params) => {
    if (sql.includes("FROM preppie_backup_recovery_metadata") && sql.includes("status = 'verified'")) {
      return { rows: [
        { databaseName: "preppie_recovery_new", status: "verified", verifiedAt: "2026-07-17T00:00:00.000Z" },
        { databaseName: "preppie_recovery_mid", status: "verified", verifiedAt: "2026-07-16T00:00:00.000Z" },
        { databaseName: "preppie_recovery_old", status: "verified", verifiedAt: "2026-07-15T00:00:00.000Z" },
      ] };
    }
    return originalQuery(sql, params);
  };
  await runBackupWorker({ env: { SOURCE_DATABASE_URL: sourceUrl, RECOVERY_ADMIN_DATABASE_URL: recoveryUrl }, dependencies });
  const deleting = events.findIndex((event) => event.sql?.includes("status = 'deleting'"));
  const drop = events.findIndex((event) => event.sql?.startsWith('DROP DATABASE "preppie_recovery_old"'));
  const deleted = events.findIndex((event) => event.sql?.includes("status = 'deleted'"));
  assert.ok(deleting >= 0 && deleting < drop && drop < deleted);
});

test("unconfirmed retention transition over-retains and warns without drop", async () => {
  const events = [];
  const dependencies = createSuccessfulDependencies(events);
  const originalQuery = dependencies.admin.query.bind(dependencies.admin);
  dependencies.admin.query = async (sql, params) => {
    if (sql.includes("FROM preppie_backup_recovery_metadata") && sql.includes("status = 'verified'")) return { rows: [
      { databaseName: "preppie_recovery_new", status: "verified", verifiedAt: "2026-07-17T00:00:00.000Z" },
      { databaseName: "preppie_recovery_mid", status: "verified", verifiedAt: "2026-07-16T00:00:00.000Z" },
      { databaseName: "preppie_recovery_old", status: "verified", verifiedAt: "2026-07-15T00:00:00.000Z" },
    ] };
    if (sql.includes("status = 'deleting'")) return { rows: [], rowCount: 0 };
    return originalQuery(sql, params);
  };
  await runBackupWorker({ env: { SOURCE_DATABASE_URL: sourceUrl, RECOVERY_ADMIN_DATABASE_URL: recoveryUrl }, dependencies });
  assert.equal(events.some((event) => event.sql?.startsWith("DROP DATABASE")), false);
  assert.ok(events.some((event) => event.log?.warning === "retention_deferred"));
});
