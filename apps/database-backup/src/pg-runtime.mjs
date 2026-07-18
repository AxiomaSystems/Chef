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
        child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
        child.once("error", reject);
        child.once("close", (code) => {
          if (code === 0) resolve();
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
