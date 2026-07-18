import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { redactUrlLikeContent } from "./backup-contract.mjs";

export function createRuntimeDependencies() {
  return {
    async createClient(config) {
      const { Client } = await import("pg");
      return new Client(config);
    },
    async runCommand(command, args, options) {
      await new Promise((resolve, reject) => {
        const child = spawn(command, args, { env: options.env, stdio: ["ignore", "ignore", "pipe"] });
        let stderr = "";
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          child.kill("SIGTERM");
          setTimeout(() => child.kill("SIGKILL"), 5_000).unref();
        }, options.timeoutMs ?? 30 * 60_000);
        child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
        child.once("error", (error) => { clearTimeout(timer); reject(error); });
        child.once("close", (code) => {
          clearTimeout(timer);
          if (!timedOut && code === 0) resolve();
          else if (timedOut) reject(new Error(`${command} timed out`));
          else reject(new Error(`${command} failed (${code ?? "unknown"}): ${redactUrlLikeContent(stderr)}`));
        });
      });
    },
    createTempDirectory: () => mkdtemp(join(tmpdir(), "preppie-backup-")),
    removeTempDirectory: (directory) => rm(directory, { recursive: true, force: true }),
    makeDumpPath: (directory, databaseName) => join(directory, `${databaseName}.dump`),
    now: () => new Date(),
    randomSuffix: () => randomUUID().replaceAll("-", "_"),
    processEnvironment: process.env,
    log: (metadata) => console.log(JSON.stringify(metadata)),
  };
}
