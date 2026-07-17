import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const MIGRATE_DEPLOY_PATTERN = /\bprisma\s+migrate\s+deploy\b/i;
const API_COMMAND_PATTERN = /\b(?:node|pnpm|prisma|typescript|tsc)\b/i;
const STARTUP_SCRIPT_PATTERN =
  /(?:^|[\s"'[,])((?:\.\/|\/app\/)?(?:[\w.-]+\/)*[\w.-]+\.(?:bash|cjs|js|mjs|sh))(?=$|[\s"',;\]])/g;

function getStartupInstructions(dockerfile) {
  return dockerfile
    .replace(/\\\r?\n/g, " ")
    .split(/\r?\n/)
    .filter((line) => /^\s*(?:CMD|ENTRYPOINT)\b/i.test(line));
}

function assertNoDeployMigration(startupSources) {
  const effectiveStartup = startupSources.join("\n").replace(/\\\r?\n/g, " ");

  assert.doesNotMatch(effectiveStartup, MIGRATE_DEPLOY_PATTERN);
}

async function readReferencedStartupScripts(startupInstructions) {
  const repositoryRoot = process.cwd();
  const referencedPaths = [
    ...new Set(
      [...startupInstructions.join("\n").matchAll(STARTUP_SCRIPT_PATTERN)].map(
        (match) => match[1].replace(/^\/app\//, "").replace(/^\.\//, ""),
      ),
    ),
  ];

  return Promise.all(
    referencedPaths.map(async (referencedPath) => {
      const scriptPath = path.resolve(repositoryRoot, referencedPath);
      const relativePath = path.relative(repositoryRoot, scriptPath);

      if (
        relativePath.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relativePath)
      ) {
        return "";
      }

      try {
        return `# ${relativePath}\n${await readFile(scriptPath, "utf8")}`;
      } catch (error) {
        if (error?.code === "ENOENT") {
          return "";
        }
        throw error;
      }
    }),
  );
}

test("detects deploy migrations across Docker startup forms", () => {
  const multilineEntrypoint = getStartupInstructions(`
RUN pnpm --filter api prisma:generate
ENTRYPOINT ["sh", "-c", \\
  "pnpm exec prisma migrate deploy"]
`);

  assert.throws(() => assertNoDeployMigration(multilineEntrypoint));
  assert.throws(() =>
    assertNoDeployMigration([
      "CMD scripts/start.sh",
      "prisma \\\nmigrate deploy",
    ]),
  );
});

test("runs migrations in Railway pre-deploy and not API startup", async () => {
  const config = JSON.parse(await readFile("railway.json", "utf8"));
  const dockerfile = await readFile("Dockerfile", "utf8");
  const startupInstructions = getStartupInstructions(dockerfile);
  const startupScripts =
    await readReferencedStartupScripts(startupInstructions);

  assert.equal(
    config.deploy.preDeployCommand,
    "pnpm --dir apps/api exec prisma migrate deploy",
  );
  assert.notEqual(
    startupInstructions.length,
    0,
    "Dockerfile has no API startup instruction",
  );
  assert.ok(
    startupScripts.some(Boolean),
    "Dockerfile startup scripts could not be inspected",
  );
  assertNoDeployMigration([...startupInstructions, ...startupScripts]);
});

test("keeps Railway API and Vision service configuration isolated", async () => {
  const [apiConfig, visionConfig] = await Promise.all(
    ["railway.json", "railway.vision.json"].map(async (configPath) =>
      JSON.parse(await readFile(configPath, "utf8")),
    ),
  );

  assert.equal(
    apiConfig.deploy.preDeployCommand,
    "pnpm --dir apps/api exec prisma migrate deploy",
  );
  assert.equal(apiConfig.deploy.healthcheckPath, "/ready");
  assert.equal(apiConfig.build.dockerfilePath, "Dockerfile");
  assert.equal(visionConfig.build.builder, "DOCKERFILE");
  assert.equal(visionConfig.build.dockerfilePath, "Dockerfile");
  assert.equal(visionConfig.deploy.healthcheckPath, "/health");
  assert.equal(visionConfig.deploy.restartPolicyType, "ON_FAILURE");
  assert.equal(visionConfig.deploy.preDeployCommand, undefined);
  assert.doesNotMatch(JSON.stringify(visionConfig), MIGRATE_DEPLOY_PATTERN);
  assert.doesNotMatch(JSON.stringify(visionConfig), API_COMMAND_PATTERN);
});
