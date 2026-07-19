import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const scriptPath = "scripts/rehearse-database-recovery.ps1";

test("recovery rehearsal script requires an explicit target and credential variable names", async () => {
  const script = await readFile(scriptPath, "utf8");

  assert.match(
    script,
    /\[Parameter\(Mandatory = \$true\)\]\s*\[string\]\$RecoveryDatabaseName/,
  );
  assert.match(
    script,
    /\[Parameter\(Mandatory = \$true\)\]\s*\[string\]\$SourceDatabaseUrlVariableName/,
  );
  assert.match(
    script,
    /\[Parameter\(Mandatory = \$true\)\]\s*\[string\]\$RecoveryAdminDatabaseUrlVariableName/,
  );
  assert.doesNotMatch(
    script,
    /\[string\]\$(?:Source|RecoveryAdmin)DatabaseUrl\b/,
  );
});

test("recovery rehearsal passes credentials to Docker by environment name only", async () => {
  const script = await readFile(scriptPath, "utf8");
  const dockerInvocation = script.match(
    /\$workerOutput = @\([\s\S]+?& docker run[\s\S]+?\$ImageName 2>&1/,
  )?.[0];

  assert.ok(dockerInvocation, "Docker worker invocation is missing");
  assert.match(dockerInvocation, /--env SOURCE_DATABASE_URL/);
  assert.match(dockerInvocation, /--env RECOVERY_ADMIN_DATABASE_URL/);
  assert.match(dockerInvocation, /--env BACKUP_RUN_ID/);
  assert.doesNotMatch(
    dockerInvocation,
    /\$sourceUrl|\$recoveryUrl|postgres(?:ql)?:\/\//i,
  );
});

test("recovery rehearsal inspects and cleans only resolved attempt names", async () => {
  const script = await readFile(scriptPath, "utf8");

  assert.match(
    script,
    /@\(\$resolved\.databaseName, \$resolved\.retryDatabaseName\)/,
  );
  assert.match(
    script,
    /@\("inspect", \$RecoveryDatabaseName, \$actualDatabaseName\)/,
  );
  assert.match(script, /@\("cleanup", \$RecoveryDatabaseName, \$candidate\)/);
  assert.match(script, /--entrypoint node/);
  assert.doesNotMatch(script, /DROP\s+DATABASE/i);
});

test("recovery rehearsal persists verified evidence before guarded cleanup", async () => {
  const script = await readFile(scriptPath, "utf8");
  const preCleanupEvidence = script.indexOf(
    "$evidenceJson = Write-RehearsalEvidence",
  );
  const cleanupGate = script.indexOf(
    'if ($status -eq "passed" -and $Cleanup -and $null -ne $resolved)',
  );

  assert.ok(preCleanupEvidence >= 0, "pre-cleanup evidence write is missing");
  assert.ok(
    cleanupGate > preCleanupEvidence,
    "cleanup precedes evidence write",
  );
});

test("rejected targets never appear in stdout or persisted evidence", async () => {
  const marker = `postgresql://operator:${randomUUID()}@production.invalid/db`;
  const evidencePath = join(tmpdir(), `preppie-rejected-${randomUUID()}.json`);
  try {
    const result = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-File",
        scriptPath,
        "-RecoveryDatabaseName",
        marker,
        "-SourceDatabaseUrlVariableName",
        "MISSING_SOURCE_DATABASE_URL",
        "-RecoveryAdminDatabaseUrlVariableName",
        "MISSING_RECOVERY_DATABASE_URL",
        "-EvidencePath",
        evidencePath,
      ],
      { encoding: "utf8" },
    );
    const evidence = await readFile(evidencePath, "utf8");

    assert.notEqual(result.status, 0);
    assert.doesNotMatch(
      result.stdout,
      new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
    assert.doesNotMatch(
      result.stderr,
      new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
    assert.doesNotMatch(evidence, /postgres(?:ql)?:\/\//i);
    assert.deepEqual(Object.keys(JSON.parse(evidence)).sort(), [
      "finishedAt",
      "stageDurationsMs",
      "startedAt",
      "status",
    ]);
  } finally {
    await rm(evidencePath, { force: true });
  }
});

test("valid targets persist allowlisted evidence when setup fails", async () => {
  const evidencePath = join(
    tmpdir(),
    `preppie-setup-failed-${randomUUID()}.json`,
  );
  try {
    const result = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-File",
        scriptPath,
        "-RecoveryDatabaseName",
        "preppie_recovery_rehearsal_setup_failed_a1",
        "-SourceDatabaseUrlVariableName",
        "MISSING_SOURCE_DATABASE_URL",
        "-RecoveryAdminDatabaseUrlVariableName",
        "MISSING_RECOVERY_DATABASE_URL",
        "-EvidencePath",
        evidencePath,
      ],
      { encoding: "utf8" },
    );
    const evidence = JSON.parse(await readFile(evidencePath, "utf8"));

    assert.notEqual(result.status, 0);
    assert.equal(evidence.status, "failed");
    assert.equal(evidence.runId, "rehearsal_setup_failed");
    assert.equal(
      evidence.databaseName,
      "preppie_recovery_rehearsal_setup_failed_a1",
    );
    assert.deepEqual(Object.keys(evidence).sort(), [
      "databaseName",
      "finishedAt",
      "runId",
      "stageDurationsMs",
      "startedAt",
      "status",
    ]);
  } finally {
    await rm(evidencePath, { force: true });
  }
});
