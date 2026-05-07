const { existsSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const { join } = require("node:path");

const candidates = ["dist/src/main.js", "dist/apps/api/src/main.js"];
const entrypoint = candidates.find((candidate) => existsSync(join(process.cwd(), candidate)));

if (!entrypoint) {
  console.error(`Could not find API build output. Checked: ${candidates.join(", ")}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [entrypoint], { stdio: "inherit" });

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
