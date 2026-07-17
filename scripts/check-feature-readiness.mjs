#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const REQUIRED_DEPLOYMENT_URL_KEYS = [
  "READINESS_WEB_BASE_URL",
  "READINESS_API_BASE_URL",
];
const DEPLOYMENT_ENVIRONMENTS = new Set(["staging", "production"]);
const OPTIONAL_CAPABILITY_STATUSES = new Set(["ready", "disabled", "degraded"]);
const OPTIONAL_PROVIDER_STATUSES = new Set([
  "configured",
  "disabled",
  "partner_required",
]);
const VOICE_CAPABILITY_KEYS = [
  "conversationalAgent",
  "speechToText",
  "textToSpeech",
];

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

function hasMisconfiguredStatus(value) {
  if (Array.isArray(value)) {
    return value.some(hasMisconfiguredStatus);
  }

  if (!isRecord(value)) {
    return false;
  }

  if (value.status === "misconfigured") {
    return true;
  }

  return Object.values(value).some(hasMisconfiguredStatus);
}

function assertNoMisconfiguredFeatures(features, label) {
  assertRecord(features, `${label} feature`);

  if (hasMisconfiguredStatus(features)) {
    throw new Error(`[READINESS] ${label} reported a misconfigured feature.`);
  }
}

function assertOptionalCapability(capability, label) {
  if (
    !isRecord(capability) ||
    !OPTIONAL_CAPABILITY_STATUSES.has(capability.status)
  ) {
    throw new Error(`[READINESS] ${label} schema is invalid.`);
  }
}

function assertWebReadinessSchema(webReadiness) {
  if (
    !isRecord(webReadiness.environment) ||
    typeof webReadiness.environment.name !== "string"
  ) {
    throw new Error("[READINESS] web environment schema is invalid.");
  }

  if (!isRecord(webReadiness.api) || webReadiness.api.status !== "ready") {
    throw new Error("[READINESS] web API capability must be ready.");
  }

  if (
    !isRecord(webReadiness.voice) ||
    !isRecord(webReadiness.voice.capabilities)
  ) {
    throw new Error("[READINESS] web voice capability schema is invalid.");
  }

  assertOptionalCapability(webReadiness.voice, "web voice capability");

  for (const key of VOICE_CAPABILITY_KEYS) {
    assertOptionalCapability(
      webReadiness.voice.capabilities[key],
      "web voice capability",
    );
  }
}

function assertApiProviders(providers) {
  assertRecord(providers, "API provider");

  for (const provider of Object.values(providers)) {
    if (!isRecord(provider)) {
      throw new Error("[READINESS] API provider schema is invalid.");
    }

    if (provider.status === "missing_credentials") {
      throw new Error(
        "[READINESS] An API provider is enabled without required credentials.",
      );
    }

    if (!OPTIONAL_PROVIDER_STATUSES.has(provider.status)) {
      throw new Error("[READINESS] API provider schema is invalid.");
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

  if (apiReadiness.environment !== expectedEnvironment) {
    throw new Error(
      "[READINESS] API environment must match READINESS_ENVIRONMENT.",
    );
  }

  if (webReadiness.environment.name !== expectedEnvironment) {
    throw new Error(
      "[READINESS] web environment must match READINESS_ENVIRONMENT.",
    );
  }

  if (
    !isRecord(apiReadiness.database) ||
    apiReadiness.database.status !== "ready"
  ) {
    throw new Error("[READINESS] API database must be ready.");
  }

  if (apiReadiness.status !== "ready") {
    throw new Error("[READINESS] API readiness status must be ready.");
  }

  assertNoMisconfiguredFeatures(apiReadiness.features, "API");
  assertNoMisconfiguredFeatures(webReadiness, "web");
  assertApiProviders(apiReadiness.providers);
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
