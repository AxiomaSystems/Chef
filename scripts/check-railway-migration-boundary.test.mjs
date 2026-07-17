import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("runs migrations in Railway pre-deploy and not API startup", async () => {
  const config = JSON.parse(await readFile("railway.json", "utf8"));
  const dockerfile = await readFile("Dockerfile", "utf8");

  assert.equal(
    config.deploy.preDeployCommand,
    "pnpm --dir apps/api exec prisma migrate deploy",
  );
  assert.doesNotMatch(
    dockerfile.match(/^CMD .*$/m)?.[0] ?? "",
    /migrate deploy/,
  );
});
