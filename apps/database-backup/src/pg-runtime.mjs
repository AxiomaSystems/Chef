import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { redactUrlLikeContent } from "./backup-contract.mjs";

export function createProcessRunner({ spawnImpl = spawn, setTimeoutImpl = setTimeout, clearTimeoutImpl = clearTimeout } = {}) {
  return async function runCommand(command, args, options) {
    await new Promise((resolve, reject) => {
      const child = spawnImpl(command, args, { env: options.env, stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      let timedOut = false;
      const timer = setTimeoutImpl(() => {
        timedOut = true;
        child.kill("SIGTERM");
        setTimeoutImpl(() => child.kill("SIGKILL"), 5_000).unref?.();
      }, options.timeoutMs ?? 30 * 60_000);
      child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
      child.once("error", (error) => { clearTimeoutImpl(timer); reject(error); });
      child.once("close", (code) => {
        clearTimeoutImpl(timer);
        if (!timedOut && code === 0) resolve();
        else if (timedOut) reject(new Error(`${command} timed out`));
        else reject(new Error(`${command} failed (${code ?? "unknown"}): ${redactUrlLikeContent(stderr)}`));
      });
    });
  };
}

export function createRuntimeDependencies() {
  return {
    async createClient(config) {
      const { Client } = await import("pg");
      return new Client(config);
    },
    runCommand: createProcessRunner(),
    createTempDirectory: () => mkdtemp(join(tmpdir(), "preppie-backup-")),
    removeTempDirectory: (directory) => rm(directory, { recursive: true, force: true }),
    makeDumpPath: (directory, databaseName) => join(directory, `${databaseName}.dump`),
    now: () => new Date(),
    randomSuffix: () => randomUUID().replaceAll("-", "_"),
    processEnvironment: process.env,
    log: (metadata) => console.log(JSON.stringify(metadata)),
  };
}
