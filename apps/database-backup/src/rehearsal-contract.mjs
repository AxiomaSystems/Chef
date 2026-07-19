import {
  createRecoveryDatabaseName,
  normalizedCount,
  quoteRecoveryIdentifier,
} from "./backup-contract.mjs";

const REHEARSAL_ATTEMPT_ONE_PATTERN =
  /^preppie_recovery_(rehearsal_[a-z0-9_]+)_a1$/;
const MIGRATION_PATTERN = /^[A-Za-z0-9_]+$/;
const ALLOWED_STATUSES = new Set(["passed", "failed"]);
const ALLOWED_STAGES = new Set([
  "sourcePreparation",
  "backupRestore",
  "apiReadiness",
  "webReadiness",
  "cleanup",
  "total",
]);
const CRITICAL_TABLES = ["User", "BaseRecipe", "ShoppingCart"];

function fail(message) {
  throw new Error(message);
}

function validIsoTimestamp(value, label) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    fail(`${label} must be an ISO timestamp.`);
  }
  return new Date(value).toISOString();
}

function validMigration(value, label) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !MIGRATION_PATTERN.test(value)) {
    fail(`${label} is invalid.`);
  }
  return value;
}

function validNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail(`${label} must be a non-negative integer.`);
  }
  return value;
}

export function resolveRehearsalTarget(databaseName) {
  if (typeof databaseName !== "string" || databaseName.length > 63) {
    fail("Recovery database must be an exact rehearsal target.");
  }
  const match = REHEARSAL_ATTEMPT_ONE_PATTERN.exec(databaseName);
  if (!match)
    fail("Recovery database must be an exact rehearsal attempt-one target.");

  const runId = match[1];
  const generatedAttemptOne = createRecoveryDatabaseName({ runId, attempt: 1 });
  const retryDatabaseName = createRecoveryDatabaseName({ runId, attempt: 2 });
  if (generatedAttemptOne !== databaseName) {
    fail("Recovery database does not map exactly to BACKUP_RUN_ID.");
  }

  return { databaseName, retryDatabaseName, runId };
}

export function quoteResolvedRehearsalIdentifier(databaseName, resolution) {
  if (
    !resolution ||
    !new Set([resolution.databaseName, resolution.retryDatabaseName]).has(
      databaseName,
    )
  ) {
    fail("Cleanup database is not an explicitly resolved rehearsal target.");
  }
  return quoteRecoveryIdentifier(databaseName);
}

export function parseIsolatedHttpsOrigin(value) {
  let origin;
  try {
    origin = new URL(value);
  } catch {
    fail("Readiness target must be a clean isolated HTTPS origin.");
  }
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    !origin.hostname ||
    !/(?:rehearsal|recovery)/i.test(origin.hostname)
  ) {
    fail("Readiness target must be a clean isolated HTTPS origin.");
  }
  return origin.origin;
}

function sanitizeDurations(stageDurationsMs) {
  if (!stageDurationsMs || typeof stageDurationsMs !== "object") {
    fail("Rehearsal evidence requires stage durations.");
  }
  const output = {};
  for (const [stage, duration] of Object.entries(stageDurationsMs)) {
    if (!ALLOWED_STAGES.has(stage))
      fail("Rehearsal evidence contains an unknown stage.");
    output[stage] = validNonNegativeInteger(duration, `${stage} duration`);
  }
  return output;
}

function sanitizeTableCounts(tableCounts) {
  if (!tableCounts || typeof tableCounts !== "object") {
    fail("Rehearsal evidence requires critical table counts.");
  }
  return Object.fromEntries(
    CRITICAL_TABLES.map((table) => [
      table,
      normalizedCount(tableCounts[table], table),
    ]),
  );
}

export function createRehearsalEvidence(input) {
  if (
    !input ||
    typeof input !== "object" ||
    !ALLOWED_STATUSES.has(input.status)
  ) {
    fail("Rehearsal evidence status must be passed or failed.");
  }
  const attemptOneName = createRecoveryDatabaseName({
    runId: input.runId,
    attempt: 1,
  });
  const target = resolveRehearsalTarget(attemptOneName);
  if (
    !new Set([target.databaseName, target.retryDatabaseName]).has(
      input.databaseName,
    )
  ) {
    fail("Rehearsal evidence target does not match run ID.");
  }

  const evidence = {
    status: input.status,
    runId: target.runId,
    databaseName: input.databaseName,
    startedAt: validIsoTimestamp(input.startedAt, "startedAt"),
    finishedAt: validIsoTimestamp(input.finishedAt, "finishedAt"),
    stageDurationsMs: sanitizeDurations(input.stageDurationsMs),
  };
  if (input.tableCounts !== undefined) {
    evidence.tableCounts = sanitizeTableCounts(input.tableCounts);
  }
  const sourceLatestMigration = validMigration(
    input.sourceLatestMigration,
    "sourceLatestMigration",
  );
  const restoredLatestMigration = validMigration(
    input.restoredLatestMigration,
    "restoredLatestMigration",
  );
  if (sourceLatestMigration !== undefined) {
    evidence.sourceLatestMigration = sourceLatestMigration;
  }
  if (restoredLatestMigration !== undefined) {
    evidence.restoredLatestMigration = restoredLatestMigration;
  }
  if (input.migrationCount !== undefined) {
    evidence.migrationCount = validNonNegativeInteger(
      input.migrationCount,
      "migrationCount",
    );
  }
  if (input.databaseSizeBytes !== undefined) {
    evidence.databaseSizeBytes = normalizedCount(
      input.databaseSizeBytes,
      "database size",
    );
  }
  if (
    input.status === "passed" &&
    (!evidence.tableCounts ||
      evidence.sourceLatestMigration === undefined ||
      evidence.restoredLatestMigration === undefined ||
      evidence.migrationCount === undefined ||
      evidence.databaseSizeBytes === undefined)
  ) {
    fail("Passed rehearsal evidence requires complete verification metadata.");
  }
  return evidence;
}
