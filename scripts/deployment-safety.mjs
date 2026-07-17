import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function loadRootEnv(env = process.env, root = process.cwd()) {
  const envPath = resolve(root, ".env");

  if (!existsSync(envPath)) return env;

  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    if (key && env[key] === undefined) env[key] = value;
  }

  return env;
}

export function deploymentEnvironment(env = process.env) {
  return (
    env.DEPLOYMENT_ENVIRONMENT ??
    env.RAILWAY_ENVIRONMENT_NAME ??
    env.VERCEL_ENV ??
    "local"
  )
    .trim()
    .toLowerCase();
}

export function assertLocalDatabaseReset(env = process.env) {
  const environment = deploymentEnvironment(env);
  const databaseUrl = env.SUPABASE_DATABASE_URL ?? env.DATABASE_URL;

  if (environment !== "local" && environment !== "test") {
    throw new Error(
      `[DB SAFETY] api:reset is local-only; current environment is ${environment}.`,
    );
  }

  if (!databaseUrl) {
    throw new Error(
      "[DB SAFETY] DATABASE_URL or SUPABASE_DATABASE_URL is required before api:reset.",
    );
  }

  let hostname;

  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    throw new Error("[DB SAFETY] The configured database URL is invalid.");
  }

  if (!LOCAL_DATABASE_HOSTS.has(hostname)) {
    throw new Error(
      `[DB SAFETY] api:reset refused non-local database host ${hostname}.`,
    );
  }
}

export function assertSafeStartupSeed(env = process.env) {
  if (env.RUN_DB_SEED_ON_STARTUP !== "true") return;

  const environment = deploymentEnvironment(env);

  if (environment !== "staging") {
    throw new Error(
      `[DB SAFETY] RUN_DB_SEED_ON_STARTUP=true is allowed only in staging; current environment is ${environment}.`,
    );
  }
}
