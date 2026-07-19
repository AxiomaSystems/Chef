import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
