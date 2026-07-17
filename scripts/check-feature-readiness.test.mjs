import assert from "node:assert/strict";
import test from "node:test";
import {
  assertFeatureReadinessConfiguration,
  assertFeatureReadinessPayloads,
  runFeatureReadinessSmoke,
} from "./check-feature-readiness.mjs";

const readinessEnvironment = {
  READINESS_WEB_BASE_URL: "https://preview.example.com",
  READINESS_API_BASE_URL: "https://api-staging.example.com",
  READINESS_ENVIRONMENT: "staging",
};

const readyApi = {
  status: "ready",
  service: "api",
  environment: "staging",
  database: { status: "ready" },
  features: {
    ai: { status: "disabled" },
    vision: { status: "degraded" },
  },
  providers: {
    instacart: { status: "configured" },
    kroger: { status: "disabled" },
    walmart: { status: "partner_required" },
  },
};

const readyWeb = {
  environment: { name: "staging" },
  api: { status: "ready" },
  voice: {
    status: "disabled",
    capabilities: {
      conversationalAgent: { status: "disabled" },
      speechToText: { status: "disabled" },
      textToSpeech: { status: "disabled" },
    },
  },
};

test("accepts HTTPS deployment targets with ready required services and optional disabled or degraded capabilities", async () => {
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
    /web environment must match READINESS_ENVIRONMENT/,
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
        { ...readyWeb, api: { status: "degraded" } },
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
              diagnostic: "do-not-log-this-provider-value",
            },
          },
        },
        readyWeb,
        "staging",
      ),
    (error) =>
      error instanceof Error &&
      /provider is enabled without required credentials/.test(error.message) &&
      !error.message.includes("do-not-log-this-provider-value"),
  );
});

test("rejects any misconfigured feature without logging its raw payload", () => {
  const secretLikeValue = "do-not-log-this-value";

  assert.throws(
    () =>
      assertFeatureReadinessPayloads(
        {
          ...readyApi,
          features: {
            ai: { status: "misconfigured", diagnostic: secretLikeValue },
          },
        },
        readyWeb,
        "staging",
      ),
    (error) =>
      error instanceof Error &&
      /misconfigured feature/.test(error.message) &&
      !error.message.includes(secretLikeValue),
  );
});
