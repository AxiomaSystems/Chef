#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const webRequire = createRequire(resolve(repoRoot, "apps/web/package.json"));
const { loadEnvConfig } = webRequire("@next/env");
const nextBin = webRequire.resolve("next/dist/bin/next");

loadEnvConfig(repoRoot);

const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  cwd: resolve(repoRoot, "apps/web"),
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
