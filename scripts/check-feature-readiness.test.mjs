import assert from "node:assert/strict";
import test from "node:test";
import {
  assertFeatureReadinessConfiguration,
  assertFeatureReadinessPayloads,
  runFeatureReadinessSmoke,
} from "./check-feature-readiness.mjs";
import { getWebFeatureReadiness } from "../apps/web/src/lib/feature-readiness.ts";

const readinessEnvironment = {
  READINESS_WEB_BASE_URL: "https://preview.example.com",
  READINESS_API_BASE_URL: "https://api-staging.example.com",
  READINESS_ENVIRONMENT: "staging",
};

const schemaVersion = "20260628120000_add_recipe_execution_metadata";

const readyApi = {
  status: "ready",
  service: "api",
  environment: "staging",
  database: {
    status: "ready",
    schema: {
      status: "ready",
      expected: schemaVersion,
      applied: schemaVersion,
    },
  },
  features: {
    ai: { status: "disabled" },
    vision: {
      status: "ready",
      readiness_scope: "configuration",
      runtime_status: "not_checked",
    },
  },
  providers: {
    instacart: {
      status: "disabled",
      is_available: false,
      mode: "development",
    },
    kroger: {
      status: "disabled",
      is_available: false,
      mode: "production",
    },
    walmart: {
      status: "partner_required",
      is_available: false,
      mode: "sandbox",
    },
  },
};

const readyWeb = getWebFeatureReadiness({
  VERCEL: "1",
  VERCEL_ENV: "preview",
  API_BASE_URL: "https://api-staging.example.com/api/v1",
  PRODUCTION_API_BASE_URL: "https://api.example.com/api/v1",
});

const productionApi = {
  ...readyApi,
  environment: "production",
  features: {
    ...readyApi.features,
    ai: { status: "ready" },
  },
  providers: {
    ...readyApi.providers,
    instacart: {
      status: "configured",
      is_available: true,
      mode: "production",
    },
  },
};

const productionWeb = getWebFeatureReadiness({
  VERCEL: "1",
  VERCEL_ENV: "production",
  API_BASE_URL: "https://api.example.com/api/v1",
});

test("accepts a strict staging readiness contract", async () => {
  assert.equal(readyWeb.environment.name, "preview");
  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(url);
    return new Response(
      JSON.stringify(url.endsWith("/ready") ? readyApi : readyWeb),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  };

  await runFeatureReadinessSmoke(readinessEnvironment, fetchImpl, () => {});

  assert.deepEqual(requestedUrls, [
    "https://api-staging.example.com/ready",
    "https://preview.example.com/api/readiness",
  ]);
});

test("accepts production AI and configured providers only in production mode", () => {
  assert.doesNotThrow(() =>
    assertFeatureReadinessPayloads(productionApi, productionWeb, "production"),
  );
});

test("uses redirect error mode and does not expose a redirect failure payload", async () => {
  const secretLikeValue = "do-not-log-this-redirect-value";
  const requestOptions = [];

  await assert.rejects(
    () =>
      runFeatureReadinessSmoke(
        readinessEnvironment,
        async (_url, options) => {
          requestOptions.push(options);
          throw new Error(secretLikeValue);
        },
        () => assert.fail("a failed request must not log a payload"),
      ),
    (error) =>
      error instanceof Error &&
      /request failed/.test(error.message) &&
      !error.message.includes(secretLikeValue),
  );

  assert.equal(requestOptions.length, 2);
  assert.ok(
    requestOptions.every(
      (requestOptionsForService) =>
        requestOptionsForService.redirect === "error",
    ),
  );
});

test("rejects missing deployment URLs", () => {
  assert.throws(
    () =>
      assertFeatureReadinessConfiguration({
        ...readinessEnvironment,
        READINESS_WEB_BASE_URL: "",
      }),
    /Missing READINESS_WEB_BASE_URL/,
  );
});

test("rejects non-HTTPS deployment URLs", () => {
  assert.throws(
    () =>
      assertFeatureReadinessConfiguration({
        ...readinessEnvironment,
        READINESS_API_BASE_URL: "http://api-staging.example.com",
      }),
    /READINESS_API_BASE_URL must use HTTPS/,
  );
});

test("requires clean deployment origins and normalizes a trailing slash", () => {
  for (const value of [
    "https://user:credential@preview.example.com",
    "https://preview.example.com/path",
    "https://preview.example.com?token=secret-like-value",
    "https://preview.example.com#fragment",
  ]) {
    assert.throws(
      () =>
        assertFeatureReadinessConfiguration({
          ...readinessEnvironment,
          READINESS_WEB_BASE_URL: value,
        }),
      /clean HTTPS deployment origin/,
    );
  }

  const configuration = assertFeatureReadinessConfiguration({
    ...readinessEnvironment,
    READINESS_WEB_BASE_URL: "https://preview.example.com/",
  });

  assert.equal(
    configuration.READINESS_WEB_BASE_URL.href,
    "https://preview.example.com/",
  );
});

test("rejects environment identity mismatches from either service", () => {
  assert.throws(
    () =>
      assertFeatureReadinessPayloads(
        { ...readyApi, environment: "production" },
        readyWeb,
        "staging",
      ),
    /API environment must match READINESS_ENVIRONMENT/,
  );
  assert.throws(
    () =>
      assertFeatureReadinessPayloads(
        readyApi,
        { ...readyWeb, environment: { name: "production" } },
        "staging",
      ),
    /web environment must match the Vercel target mapped from READINESS_ENVIRONMENT/,
  );
});

test("rejects a non-ready database state", () => {
  assert.throws(
    () =>
      assertFeatureReadinessPayloads(
        {
          ...readyApi,
          status: "not_ready",
          database: { status: "not_ready" },
        },
        readyWeb,
        "staging",
      ),
    /API database must be ready/,
  );
});

test("requires the API and web service contracts", () => {
  assert.throws(
    () =>
      assertFeatureReadinessPayloads(
        { ...readyApi, service: "worker" },
        readyWeb,
        "staging",
      ),
    /API service must be api/,
  );
  assert.throws(
    () =>
      assertFeatureReadinessPayloads(
        readyApi,
        { ...readyWeb, api: { ...readyWeb.api, status: "degraded" } },
        "staging",
      ),
    /web API capability must be ready/,
  );
  assert.throws(
    () =>
      assertFeatureReadinessPayloads(
        readyApi,
        { ...readyWeb, voice: { status: "disabled" } },
        "staging",
      ),
    /web voice capability schema is invalid/,
  );
});

test("requires a safe, current database schema signal", () => {
  for (const database of [
    { status: "ready" },
    { status: "ready", schema: {} },
    {
      status: "ready",
      schema: {
        status: "ready",
        expected: schemaVersion,
        applied: "20260627124500_backfill_recipe_profiles",
      },
    },
    {
      status: "ready",
      schema: {
        status: "ready",
        expected: "unsafe schema value",
        applied: "unsafe schema value",
      },
    },
  ]) {
    assert.throws(
      () =>
        assertFeatureReadinessPayloads(
          { ...readyApi, database },
          readyWeb,
          "staging",
        ),
      /API database schema must be ready and current/,
    );
  }
});

test("requires exact AI and Vision configuration signals per environment", () => {
  for (const features of [
    {},
    { vision: readyApi.features.vision },
    { ...readyApi.features, unexpected: { status: "ready" } },
    {
      ...readyApi.features,
      vision: { status: "ready" },
    },
  ]) {
    assert.throws(
      () =>
        assertFeatureReadinessPayloads(
          { ...readyApi, features },
          readyWeb,
          "staging",
        ),
      /API feature readiness schema is invalid/,
    );
  }

  assert.throws(
    () =>
      assertFeatureReadinessPayloads(
        {
          ...productionApi,
          features: {
            ...productionApi.features,
            ai: { status: "disabled" },
          },
        },
        productionWeb,
        "production",
      ),
    /production AI must be ready/,
  );
  assert.throws(
    () =>
      assertFeatureReadinessPayloads(
        {
          ...readyApi,
          features: {
            ...readyApi.features,
            ai: { status: "ready" },
          },
        },
        readyWeb,
        "staging",
      ),
    /staging AI must be disabled/,
  );
  assert.throws(
    () =>
      assertFeatureReadinessPayloads(
        {
          ...readyApi,
          features: {
            ...readyApi.features,
            vision: {
              ...readyApi.features.vision,
              status: "disabled",
            },
          },
        },
        readyWeb,
        "staging",
      ),
    /Vision configuration readiness is invalid/,
  );
});

test("requires exact web capability keys and known optional statuses", () => {
  assert.doesNotThrow(() =>
    assertFeatureReadinessPayloads(
      readyApi,
      {
        ...readyWeb,
        voice: {
          ...readyWeb.voice,
          status: "degraded",
          capabilities: {
            ...readyWeb.voice.capabilities,
            textToSpeech: {
              ...readyWeb.voice.capabilities.textToSpeech,
              status: "degraded",
            },
          },
        },
      },
      "staging",
    ),
  );
  assert.throws(
    () =>
      assertFeatureReadinessPayloads(
        readyApi,
        {
          ...readyWeb,
          voice: {
            ...readyWeb.voice,
            capabilities: {},
          },
        },
        "staging",
      ),
    /web voice capability schema is invalid/,
  );
  assert.throws(
    () =>
      assertFeatureReadinessPayloads(
        readyApi,
        {
          ...readyWeb,
          voice: {
            ...readyWeb.voice,
            capabilities: {
              ...readyWeb.voice.capabilities,
              unexpected: { status: "ready", environment: ["SAFE_NAME"] },
            },
          },
        },
        "staging",
      ),
    /web voice capability schema is invalid/,
  );
  assert.throws(
    () =>
      assertFeatureReadinessPayloads(
        readyApi,
        {
          ...readyWeb,
          voice: { ...readyWeb.voice, status: "unknown" },
        },
        "staging",
      ),
    /web voice capability schema is invalid/,
  );
});

test("rejects providers enabled without credentials while allowing optional provider states", () => {
  assert.doesNotThrow(() =>
    assertFeatureReadinessPayloads(readyApi, readyWeb, "staging"),
  );
  assert.throws(
    () =>
      assertFeatureReadinessPayloads(
        {
          ...readyApi,
          providers: {
            ...readyApi.providers,
            kroger: {
              status: "missing_credentials",
              is_available: false,
              mode: "production",
            },
          },
        },
        readyWeb,
        "staging",
      ),
    /provider is enabled without required credentials/,
  );
});

test("requires exact provider signals and forbids configured providers in staging", () => {
  for (const providers of [
    {},
    { ...readyApi.providers, kroger: {} },
    {
      ...readyApi.providers,
      kroger: { status: "disabled", mode: "production" },
    },
    {
      ...readyApi.providers,
      unexpected: {
        status: "disabled",
        is_available: false,
        mode: "sandbox",
      },
    },
  ]) {
    assert.throws(
      () =>
        assertFeatureReadinessPayloads(
          { ...readyApi, providers },
          readyWeb,
          "staging",
        ),
      /API provider readiness schema is invalid/,
    );
  }

  assert.throws(
    () =>
      assertFeatureReadinessPayloads(
        {
          ...readyApi,
          providers: {
            ...readyApi.providers,
            instacart: {
              status: "configured",
              is_available: true,
              mode: "production",
            },
          },
        },
        readyWeb,
        "staging",
      ),
    /staging providers must not be configured/,
  );
  for (const provider of [
    {
      status: "configured",
      is_available: true,
      mode: "development",
    },
    {
      status: "configured",
      is_available: false,
      mode: "production",
    },
  ]) {
    assert.throws(
      () =>
        assertFeatureReadinessPayloads(
          {
            ...productionApi,
            providers: {
              ...productionApi.providers,
              instacart: provider,
            },
          },
          productionWeb,
          "production",
        ),
      /configured providers require production mode and availability/,
    );
  }
});

test("rejects invalid readiness without logging raw payload values", () => {
  const secretLikeValue = "do-not-log-this-value";

  assert.throws(
    () =>
      assertFeatureReadinessPayloads(
        {
          ...readyApi,
          database: {
            status: "ready",
            schema: {
              status: "ready",
              expected: secretLikeValue,
              applied: secretLikeValue,
            },
          },
        },
        readyWeb,
        "staging",
      ),
    (error) =>
      error instanceof Error &&
      /API database schema must be ready and current/.test(error.message) &&
      !error.message.includes(secretLikeValue),
  );
});
