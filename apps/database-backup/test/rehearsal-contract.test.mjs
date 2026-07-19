import assert from "node:assert/strict";
import test from "node:test";

import {
  createRehearsalEvidence,
  parseIsolatedHttpsOrigin,
  quoteResolvedRehearsalIdentifier,
  resolveRehearsalTarget,
} from "../src/rehearsal-contract.mjs";
import { createRecoveryDatabaseName } from "../src/backup-contract.mjs";

test("resolves only an exact rehearsal attempt-one target", () => {
  const resolution = resolveRehearsalTarget(
    "preppie_recovery_rehearsal_local_20260717_a1",
  );
  assert.deepEqual(resolution, {
    databaseName: "preppie_recovery_rehearsal_local_20260717_a1",
    retryDatabaseName: "preppie_recovery_rehearsal_local_20260717_a2",
    runId: "rehearsal_local_20260717",
  });
  assert.equal(
    quoteResolvedRehearsalIdentifier(resolution.databaseName, resolution),
    '"preppie_recovery_rehearsal_local_20260717_a1"',
  );
  assert.throws(
    () =>
      quoteResolvedRehearsalIdentifier(
        "preppie_recovery_verified_existing_a1",
        resolution,
      ),
    /explicitly resolved rehearsal/i,
  );
  assert.equal(
    createRecoveryDatabaseName({
      runId: "rehearsal_local_20260717",
      now: new Date("2030-01-01T00:00:00.000Z"),
      attempt: 1,
    }),
    "preppie_recovery_rehearsal_local_20260717_a1",
  );
  assert.equal(
    createRecoveryDatabaseName({
      runId: "rehearsal_local_20260717",
      now: new Date("2030-01-01T00:00:00.000Z"),
      attempt: 2,
    }),
    "preppie_recovery_rehearsal_local_20260717_a2",
  );
  assert.match(
    createRecoveryDatabaseName({
      runId: "scheduled",
      now: new Date("2030-01-01T00:00:00.000Z"),
      attempt: 1,
    }),
    /^preppie_recovery_20300101000000_scheduled_a1$/,
  );

  for (const value of [
    "",
    "postgres",
    "railway",
    "preppie",
    "preppie_staging",
    "preppie_recovery_20260717_rehearsal_local_a1",
    "preppie_recovery_rehearsal_local_*_a1",
    "preppie_recovery_rehearsal_local-a1",
    "preppie_recovery_rehearsal_local_a2",
    " preppie_recovery_rehearsal_local_a1",
  ]) {
    assert.throws(() => resolveRehearsalTarget(value), /rehearsal/i, value);
  }
});

test("accepts only clean isolated HTTPS origins", () => {
  assert.equal(
    parseIsolatedHttpsOrigin("https://api-rehearsal.example.test"),
    "https://api-rehearsal.example.test",
  );
  for (const value of [
    "http://api-rehearsal.example.test",
    "https://user:secret@api-rehearsal.example.test",
    "https://api-rehearsal.example.test/path",
    "https://api-rehearsal.example.test?token=secret",
    "https://api-rehearsal.example.test/#fragment",
  ]) {
    assert.throws(
      () => parseIsolatedHttpsOrigin(value),
      /HTTPS origin/i,
      value,
    );
  }
});

test("emits only allowlisted metadata evidence", () => {
  const evidence = createRehearsalEvidence({
    status: "passed",
    runId: "rehearsal_local_20260717",
    databaseName: "preppie_recovery_rehearsal_local_20260717_a1",
    startedAt: "2026-07-17T18:00:00.000Z",
    finishedAt: "2026-07-17T18:00:12.000Z",
    stageDurationsMs: {
      sourcePreparation: 4000,
      backupRestore: 6000,
      cleanup: 2000,
      total: 12000,
    },
    sourceLatestMigration: "20260717170000_add_database_release_compatibility",
    restoredLatestMigration:
      "20260717170000_add_database_release_compatibility",
    migrationCount: 71,
    databaseSizeBytes: "1048576",
    tableCounts: { User: "1", BaseRecipe: "1", ShoppingCart: "1" },
    sourceDatabaseUrl: "postgresql://user:secret@localhost/source",
    sql: 'SELECT * FROM "User"',
    rows: [{ email: "private@example.test" }],
    error: new Error("postgresql://user:secret@localhost/source failed"),
  });

  assert.deepEqual(Object.keys(evidence).sort(), [
    "databaseName",
    "databaseSizeBytes",
    "finishedAt",
    "migrationCount",
    "restoredLatestMigration",
    "runId",
    "sourceLatestMigration",
    "stageDurationsMs",
    "startedAt",
    "status",
    "tableCounts",
  ]);
  assert.doesNotMatch(
    JSON.stringify(evidence),
    /secret|postgresql:\/\/|SELECT|private@/i,
  );
});

test("accepts a verified retry target without weakening run ID binding", () => {
  const evidence = createRehearsalEvidence({
    status: "passed",
    runId: "rehearsal_local_retry",
    databaseName: "preppie_recovery_rehearsal_local_retry_a2",
    startedAt: "2026-07-17T18:00:00.000Z",
    finishedAt: "2026-07-17T18:00:12.000Z",
    stageDurationsMs: { backupRestore: 12000, total: 12000 },
    sourceLatestMigration: "20260717170000_add_database_release_compatibility",
    restoredLatestMigration:
      "20260717170000_add_database_release_compatibility",
    migrationCount: 71,
    databaseSizeBytes: "1048576",
    tableCounts: { User: "1", BaseRecipe: "1", ShoppingCart: "1" },
  });

  assert.equal(
    evidence.databaseName,
    "preppie_recovery_rehearsal_local_retry_a2",
  );
  assert.throws(
    () =>
      createRehearsalEvidence({
        ...evidence,
        runId: "rehearsal_different",
      }),
    /does not match run ID/i,
  );
});

test("failed evidence remains allowlisted when validation never produced counts", () => {
  const evidence = createRehearsalEvidence({
    status: "failed",
    runId: "rehearsal_local_20260717",
    databaseName: "preppie_recovery_rehearsal_local_20260717_a1",
    startedAt: "2026-07-17T18:00:00.000Z",
    finishedAt: "2026-07-17T18:00:01.000Z",
    stageDurationsMs: { total: 1000 },
    error: "postgresql://user:secret@localhost/source failed",
  });

  assert.deepEqual(Object.keys(evidence).sort(), [
    "databaseName",
    "finishedAt",
    "runId",
    "stageDurationsMs",
    "startedAt",
    "status",
  ]);
  assert.doesNotMatch(JSON.stringify(evidence), /secret|postgresql:\/\//i);
});

test("canonicalizes valid offset timestamps before writing evidence", () => {
  const evidence = createRehearsalEvidence({
    status: "failed",
    runId: "rehearsal_local_20260717",
    databaseName: "preppie_recovery_rehearsal_local_20260717_a1",
    startedAt: "2026-07-17T18:00:00.1234567+00:00",
    finishedAt: "2026-07-17T18:00:01.0000000+00:00",
    stageDurationsMs: { total: 877 },
  });

  assert.equal(evidence.startedAt, "2026-07-17T18:00:00.123Z");
  assert.equal(evidence.finishedAt, "2026-07-17T18:00:01.000Z");
});
