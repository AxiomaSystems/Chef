import { randomUUID } from "node:crypto";

export const BACKUP_ADVISORY_LOCK_KEY = "684751928403617";

const RECOVERY_DATABASE_PREFIX = "preppie_recovery_";
const RECOVERY_DATABASE_PATTERN = /^preppie_recovery_[a-z0-9_]+$/;
const RUN_ID_PATTERN = /^[a-z0-9_]{1,32}$/;
const REQUIRED_TABLES = ["User", "Recipe", "ShoppingCart", "_prisma_migrations"];
const COUNTED_TABLES = ["User", "Recipe", "ShoppingCart"];

function fail(message) {
  throw new Error(message);
}
function requireSafeRunId(runId) {
  if (typeof runId !== "string" || !RUN_ID_PATTERN.test(runId)) {
    fail("BACKUP_RUN_ID must contain only lowercase letters, digits, and underscores.");
  }

  return runId;
}

export function timestampSegment(now) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    fail("A valid backup timestamp is required.");
  }

  return now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14).toLowerCase();
}

export function createRecoveryDatabaseName({ runId, now = new Date(), attempt = 1, randomSuffix } = {}) {
  const safeRunId = runId === undefined ? undefined : requireSafeRunId(runId);
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > 2) {
    fail("Backup attempt must be either 1 or 2.");
  }

  const generatedSuffix = randomSuffix ?? randomUUID().replaceAll("-", "_");
  if (typeof generatedSuffix !== "string" || !/^[a-z0-9_]+$/.test(generatedSuffix)) {
    fail("Generated recovery database suffix is invalid.");
  }

  const parts = [timestampSegment(now), safeRunId ?? generatedSuffix, `a${attempt}`];
  const name = `${RECOVERY_DATABASE_PREFIX}${parts.join("_")}`;
  if (name.length > 63 || !RECOVERY_DATABASE_PATTERN.test(name)) {
    fail("Generated recovery database name is invalid.");
  }

  return name;
}

export function quoteRecoveryIdentifier(identifier) {
  if (typeof identifier !== "string" || identifier.length > 63 || !RECOVERY_DATABASE_PATTERN.test(identifier)) {
    fail("Unsafe recovery database identifier.");
  }

  return `"${identifier}"`;
}

function postgresqlClientConfig(urlValue, label) {
  if (typeof urlValue !== "string" || !urlValue.trim()) {
    fail(`Missing ${label}.`);
  }

  let url;
  try {
    url = new URL(urlValue);
  } catch {
    fail(`Invalid ${label}.`);
  }

  if (!new Set(["postgres:", "postgresql:"]).has(url.protocol)) {
    fail(`${label} must be a PostgreSQL URL.`);
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  if (!url.hostname || !database || !user || !password) {
    fail(`${label} is missing required PostgreSQL connection details.`);
  }

  const config = {
    host: url.hostname,
    port: url.port ? Number.parseInt(url.port, 10) : 5432,
    database,
    user,
    password,
  };
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    fail(`${label} contains an invalid port.`);
  }

  const sslMode = url.searchParams.get("sslmode");
  if (sslMode && sslMode !== "disable") {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

export function loadBackupConfiguration(env = process.env) {
  const source = postgresqlClientConfig(env.SOURCE_DATABASE_URL, "SOURCE_DATABASE_URL");
  const recoveryAdmin = postgresqlClientConfig(
    env.RECOVERY_ADMIN_DATABASE_URL,
    "RECOVERY_ADMIN_DATABASE_URL",
  );
  const runId = env.BACKUP_RUN_ID === undefined ? undefined : requireSafeRunId(env.BACKUP_RUN_ID);

  if (
    source.host === recoveryAdmin.host &&
    source.port === recoveryAdmin.port &&
    source.database === recoveryAdmin.database
  ) {
    fail("SOURCE_DATABASE_URL and RECOVERY_ADMIN_DATABASE_URL must not target the same database.");
  }

  return { source, recoveryAdmin, runId };
}

export function postgresChildEnvironment(config, baseEnvironment = process.env) {
  const environment = {
    PGHOST: config.host,
    PGPORT: String(config.port),
    PGDATABASE: config.database,
    PGUSER: config.user,
    PGPASSWORD: config.password,
  };
  if (baseEnvironment.PATH) environment.PATH = baseEnvironment.PATH;
  if (config.ssl) environment.PGSSLMODE = "require";
  return environment;
}

export function redactUrlLikeContent(value) {
  return String(value).replace(/\b(?:postgres(?:ql)?|https?):\/\/[^\s'"`]+/gi, "[REDACTED_URL]");
}

function normalizedMigration(row) {
  if (!row || typeof row !== "object") fail("Migration history contains an invalid row.");
  const name = row.migration_name;
  const checksum = row.checksum;
  if (typeof name !== "string" || !/^[A-Za-z0-9_]+$/.test(name)) {
    fail("Migration history contains an invalid migration name.");
  }
  if (typeof checksum !== "string" || !/^[a-f0-9]{64}$/i.test(checksum)) {
    fail("Migration history contains an invalid checksum.");
  }
  if (!row.finished_at || row.rolled_back_at || !Number.isInteger(Number(row.applied_steps_count)) || Number(row.applied_steps_count) < 1) {
    fail("Migration history contains an unfinished or invalid migration.");
  }
  return { name, checksum };
}

function normalizeMigrationHistory(rows) {
  if (!Array.isArray(rows) || rows.length === 0) fail("Migration history must not be empty.");
  const migrations = rows.map(normalizedMigration);
  const names = new Set();
  for (const migration of migrations) {
    if (names.has(migration.name)) fail("Migration history contains duplicate migration names.");
    names.add(migration.name);
  }
  return migrations;
}

export function validateMigrationParity(sourceRows, restoredRows) {
  const source = normalizeMigrationHistory(sourceRows);
  const restored = normalizeMigrationHistory(restoredRows);
  if (source.length !== restored.length) fail("Restored migration history is incomplete.");
  for (let index = 0; index < source.length; index += 1) {
    if (source[index].name !== restored[index].name || source[index].checksum !== restored[index].checksum) {
      fail("Restored migration history diverges from source.");
    }
  }
  return { migrationCount: source.length };
}

function normalizedTableNames(tables) {
  if (!Array.isArray(tables)) fail("Critical table validation requires a table list.");
  return new Set(tables.map((table) => (typeof table === "string" ? table : table?.table_name)));
}

export function normalizedCount(value, table) {
  const count = String(value);
  if (!/^\d+$/.test(count)) fail(`Invalid ${table} count.`);
  return count;
}

export function validateCriticalTablesAndCounts({ sourceTables, restoredTables, sourceCounts, restoredCounts }) {
  const sourceTableNames = normalizedTableNames(sourceTables);
  const restoredTableNames = normalizedTableNames(restoredTables);
  for (const table of REQUIRED_TABLES) {
    if (!sourceTableNames.has(table) || !restoredTableNames.has(table)) {
      fail(`Required public table ${table} is missing.`);
    }
  }

  const tableCounts = {};
  for (const table of COUNTED_TABLES) {
    const sourceCount = normalizedCount(sourceCounts?.[table], table);
    const restoredCount = normalizedCount(restoredCounts?.[table], table);
    if (sourceCount !== restoredCount) fail(`Restored ${table} count differs from source.`);
    tableCounts[table] = sourceCount;
  }
  return { tableCounts };
}

export function selectExpiredRecoveryDatabases(databases, keepCount = 2) {
  if (!Number.isInteger(keepCount) || keepCount < 2) fail("Recovery retention must keep at least two verified databases.");
  if (!Array.isArray(databases)) fail("Recovery database metadata must be an array.");
  return databases
    .filter((database) => database?.status === "verified" && RECOVERY_DATABASE_PATTERN.test(database.databaseName))
    .map((database) => ({ ...database, verifiedTimestamp: Date.parse(database.verifiedAt) }))
    .filter((database) => !Number.isNaN(database.verifiedTimestamp))
    .sort((left, right) => right.verifiedTimestamp - left.verifiedTimestamp)
    .slice(keepCount)
    .map(({ verifiedTimestamp, ...database }) => database);
}
