#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const REQUIRED_DEPLOYMENT_URL_KEYS = [
  "READINESS_WEB_BASE_URL",
  "READINESS_API_BASE_URL",
];
const DEPLOYMENT_ENVIRONMENTS = new Set(["staging", "production"]);
const WEB_ENVIRONMENT_BY_DEPLOYMENT = {
  staging: "preview",
  production: "production",
};
const OPTIONAL_CAPABILITY_STATUSES = new Set(["ready", "disabled", "degraded"]);
const API_FEATURE_STATUSES = new Set(["ready", "disabled", "misconfigured"]);
const PROVIDER_STATUSES = new Set([
  "configured",
  "disabled",
  "partner_required",
  "missing_credentials",
]);
const PROVIDER_MODES = new Set(["production", "development", "sandbox"]);
const API_FEATURE_KEYS = ["ai", "vision"];
const PROVIDER_KEYS = ["instacart", "kroger", "walmart"];
const VOICE_CAPABILITY_KEYS = [
  "conversationalAgent",
  "speechToText",
  "textToSpeech",
];
const MIGRATION_VERSION_PATTERN = /^\d{14}_[a-z0-9_]+$/;
const HOSTED_REVISION_PATTERN = /^[a-f0-9]{40}$/i;
const ENVIRONMENT_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;

function configuredDeploymentUrl(env, key) {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`[READINESS] Missing ${key}.`);
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`[READINESS] ${key} must be a valid HTTPS deployment URL.`);
  }

  if (url.protocol !== "https:") {
    throw new Error(`[READINESS] ${key} must use HTTPS.`);
  }

  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `[READINESS] ${key} must be a clean HTTPS deployment origin.`,
    );
  }

  return new URL(url.origin);
}

function configuredEnvironment(env) {
  const value = env.READINESS_ENVIRONMENT?.trim().toLowerCase();

  if (!value) {
    throw new Error("[READINESS] Missing READINESS_ENVIRONMENT.");
  }

  if (!DEPLOYMENT_ENVIRONMENTS.has(value)) {
    throw new Error(
      "[READINESS] READINESS_ENVIRONMENT must be staging or production.",
    );
  }

  return value;
}

function endpoint(base, path) {
  return `${base.href.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value, label) {
  if (!isRecord(value)) {
    throw new Error(
      `[READINESS] ${label} returned an invalid readiness payload.`,
    );
  }
}

function hasExactKeys(value, expectedKeys) {
  if (!isRecord(value)) return false;

  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();

  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  );
}

function hasSafeEnvironmentNames(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (name) => typeof name === "string" && ENVIRONMENT_NAME_PATTERN.test(name),
    )
  );
}

function assertWebCapability(capability, label) {
  if (
    !hasExactKeys(capability, ["status", "environment"]) ||
    !OPTIONAL_CAPABILITY_STATUSES.has(capability.status) ||
    !hasSafeEnvironmentNames(capability.environment)
  ) {
    throw new Error(`[READINESS] ${label} schema is invalid.`);
  }
}

function assertWebReadinessSchema(webReadiness) {
  if (
    !hasExactKeys(webReadiness.environment, ["name"]) ||
    typeof webReadiness.environment.name !== "string"
  ) {
    throw new Error("[READINESS] web environment schema is invalid.");
  }

  if (!hasExactKeys(webReadiness.api, ["status", "environment"])) {
    throw new Error("[READINESS] web API capability schema is invalid.");
  }

  if (
    webReadiness.api.status !== "ready" ||
    !hasSafeEnvironmentNames(webReadiness.api.environment)
  ) {
    throw new Error("[READINESS] web API capability must be ready.");
  }

  if (
    !hasExactKeys(webReadiness.voice, ["status", "capabilities"]) ||
    !OPTIONAL_CAPABILITY_STATUSES.has(webReadiness.voice.status) ||
    !hasExactKeys(webReadiness.voice.capabilities, VOICE_CAPABILITY_KEYS)
  ) {
    throw new Error("[READINESS] web voice capability schema is invalid.");
  }

  for (const key of VOICE_CAPABILITY_KEYS) {
    assertWebCapability(
      webReadiness.voice.capabilities[key],
      "web voice capability",
    );
  }
}

function assertApiDatabase(database) {
  if (!isRecord(database) || database.status !== "ready") {
    throw new Error("[READINESS] API database must be ready.");
  }

  if (!hasExactKeys(database, ["status", "schema"])) {
    throw new Error(
      "[READINESS] API database schema must be ready and current.",
    );
  }

  const schema = database.schema;
  if (
    !hasExactKeys(schema, [
      "status",
      "expected",
      "applied",
      "minimum_compatible",
    ]) ||
    !new Set(["ready", "ahead_compatible"]).has(schema.status) ||
    typeof schema.expected !== "string" ||
    typeof schema.applied !== "string" ||
    typeof schema.minimum_compatible !== "string" ||
    !MIGRATION_VERSION_PATTERN.test(schema.expected) ||
    !MIGRATION_VERSION_PATTERN.test(schema.applied) ||
    !MIGRATION_VERSION_PATTERN.test(schema.minimum_compatible) ||
    (schema.status === "ready" && schema.applied !== schema.expected) ||
    (schema.status === "ahead_compatible" &&
      schema.applied <= schema.expected) ||
    schema.expected < schema.minimum_compatible
  ) {
    throw new Error(
      "[READINESS] API database schema must be ready and current.",
    );
  }
}

function assertApiRelease(release) {
  if (
    !hasExactKeys(release, ["revision"]) ||
    typeof release.revision !== "string" ||
    !HOSTED_REVISION_PATTERN.test(release.revision)
  ) {
    throw new Error("[READINESS] API release revision is invalid.");
  }
}

function assertApiFeatures(features, expectedEnvironment) {
  if (!hasExactKeys(features, API_FEATURE_KEYS)) {
    throw new Error("[READINESS] API feature readiness schema is invalid.");
  }

  if (
    !hasExactKeys(features.ai, ["status"]) ||
    !API_FEATURE_STATUSES.has(features.ai.status) ||
    !hasExactKeys(features.vision, [
      "status",
      "readiness_scope",
      "runtime_status",
    ]) ||
    !API_FEATURE_STATUSES.has(features.vision.status)
  ) {
    throw new Error("[READINESS] API feature readiness schema is invalid.");
  }

  if (expectedEnvironment === "production" && features.ai.status !== "ready") {
    throw new Error("[READINESS] production AI must be ready.");
  }

  if (expectedEnvironment === "staging" && features.ai.status !== "disabled") {
    throw new Error("[READINESS] staging AI must be disabled.");
  }

  if (
    features.vision.status !== "ready" ||
    features.vision.readiness_scope !== "configuration" ||
    features.vision.runtime_status !== "not_checked"
  ) {
    throw new Error(
      "[READINESS] API Vision configuration readiness is invalid.",
    );
  }
}

function assertApiProviders(providers, expectedEnvironment) {
  if (!hasExactKeys(providers, PROVIDER_KEYS)) {
    throw new Error("[READINESS] API provider readiness schema is invalid.");
  }

  for (const key of PROVIDER_KEYS) {
    const provider = providers[key];
    if (
      !hasExactKeys(provider, ["status", "is_available", "mode"]) ||
      !PROVIDER_STATUSES.has(provider.status) ||
      typeof provider.is_available !== "boolean" ||
      !PROVIDER_MODES.has(provider.mode)
    ) {
      throw new Error("[READINESS] API provider readiness schema is invalid.");
    }

    if (provider.status === "missing_credentials") {
      throw new Error(
        "[READINESS] An API provider is enabled without required credentials.",
      );
    }

    if (provider.status === "configured") {
      if (expectedEnvironment === "staging") {
        throw new Error(
          "[READINESS] staging providers must not be configured.",
        );
      }

      if (provider.mode !== "production" || provider.is_available !== true) {
        throw new Error(
          "[READINESS] configured providers require production mode and availability.",
        );
      }

      continue;
    }

    if (provider.is_available !== false) {
      throw new Error("[READINESS] API provider readiness schema is invalid.");
    }
  }
}

export function assertFeatureReadinessConfiguration(env = process.env) {
  const urls = Object.fromEntries(
    REQUIRED_DEPLOYMENT_URL_KEYS.map((key) => [
      key,
      configuredDeploymentUrl(env, key),
    ]),
  );

  return {
    ...urls,
    READINESS_ENVIRONMENT: configuredEnvironment(env),
  };
}

export function assertFeatureReadinessPayloads(
  apiReadiness,
  webReadiness,
  expectedEnvironment,
) {
  assertRecord(apiReadiness, "API");
  assertRecord(webReadiness, "web");
  assertWebReadinessSchema(webReadiness);

  if (apiReadiness.service !== "api") {
    throw new Error("[READINESS] API service must be api.");
  }

  assertApiRelease(apiReadiness.release);

  if (apiReadiness.environment !== expectedEnvironment) {
    throw new Error(
      "[READINESS] API environment must match READINESS_ENVIRONMENT.",
    );
  }

  if (
    webReadiness.environment.name !==
    WEB_ENVIRONMENT_BY_DEPLOYMENT[expectedEnvironment]
  ) {
    throw new Error(
      "[READINESS] web environment must match the Vercel target mapped from READINESS_ENVIRONMENT.",
    );
  }

  assertApiDatabase(apiReadiness.database);

  if (apiReadiness.status !== "ready") {
    throw new Error("[READINESS] API readiness status must be ready.");
  }

  assertApiFeatures(apiReadiness.features, expectedEnvironment);
  assertApiProviders(apiReadiness.providers, expectedEnvironment);
}

async function fetchReadiness(url, label, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(url, { redirect: "error" });
  } catch {
    throw new Error(`[READINESS] ${label} request failed.`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`[READINESS] ${label} returned invalid JSON.`);
  }

  return { response, payload };
}

function assertOk(response, label) {
  if (!response.ok) {
    throw new Error(`[READINESS] ${label} returned HTTP ${response.status}.`);
  }
}

export async function runFeatureReadinessSmoke(
  env = process.env,
  fetchImpl = fetch,
  log = console.log,
) {
  const configuration = assertFeatureReadinessConfiguration(env);
  const [api, web] = await Promise.all([
    fetchReadiness(
      endpoint(configuration.READINESS_API_BASE_URL, "ready"),
      "API /ready",
      fetchImpl,
    ),
    fetchReadiness(
      endpoint(configuration.READINESS_WEB_BASE_URL, "api/readiness"),
      "web /api/readiness",
      fetchImpl,
    ),
  ]);

  assertFeatureReadinessPayloads(
    api.payload,
    web.payload,
    configuration.READINESS_ENVIRONMENT,
  );
  assertOk(api.response, "API /ready");
  assertOk(web.response, "web /api/readiness");

  log(
    `[READINESS] ${configuration.READINESS_ENVIRONMENT} API and web report ready required services.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runFeatureReadinessSmoke().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "[READINESS] Smoke failed.",
    );
    process.exit(1);
  });
}
