#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const REQUIRED_URLS = [
  "STAGING_WEB_URL",
  "PRODUCTION_WEB_URL",
  "STAGING_API_BASE_URL",
  "PRODUCTION_API_BASE_URL",
];

function configuredUrl(env, key) {
  const value = env[key]?.trim();

  if (!value) throw new Error(`[ISOLATION] Missing ${key}.`);

  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error(`[ISOLATION] ${key} must use HTTPS.`);
  }

  return url;
}

function endpoint(base, path) {
  return `${base.href.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export function assertDistinctEnvironmentOrigins(env) {
  const urls = Object.fromEntries(
    REQUIRED_URLS.map((key) => [key, configuredUrl(env, key)]),
  );

  for (const [stagingKey, productionKey] of [
    ["STAGING_WEB_URL", "PRODUCTION_WEB_URL"],
    ["STAGING_API_BASE_URL", "PRODUCTION_API_BASE_URL"],
  ]) {
    if (urls[stagingKey].origin === urls[productionKey].origin) {
      throw new Error(
        `[ISOLATION] ${stagingKey} and ${productionKey} must use different origins.`,
      );
    }
  }

  return urls;
}

async function expectOk(url, label) {
  const response = await fetch(url, { redirect: "follow" });

  if (!response.ok) {
    throw new Error(`[ISOLATION] ${label} returned HTTP ${response.status}.`);
  }

  return response;
}

async function expectApiEnvironment(base, expected) {
  const response = await expectOk(endpoint(base, "health"), `${expected} API`);
  const body = await response.json();

  if (body.environment !== expected) {
    throw new Error(
      `[ISOLATION] ${expected} API reported environment ${String(body.environment)}.`,
    );
  }
}

export async function runIsolationSmoke(env = process.env) {
  const urls = assertDistinctEnvironmentOrigins(env);

  await Promise.all([
    expectOk(urls.STAGING_WEB_URL, "staging web"),
    expectOk(urls.PRODUCTION_WEB_URL, "production web"),
    expectApiEnvironment(urls.STAGING_API_BASE_URL, "staging"),
    expectApiEnvironment(urls.PRODUCTION_API_BASE_URL, "production"),
  ]);

  console.log(
    "[ISOLATION] Web and API staging origins are distinct and healthy.",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runIsolationSmoke().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
