import assert from "node:assert/strict";
import test from "node:test";
import { resolveApiBaseUrl } from "./runtime-env.ts";

test("uses localhost only outside a deployed environment", () => {
  assert.equal(resolveApiBaseUrl({}), "http://localhost:3001/api/v1");
});

test("requires an explicit API URL in Vercel", () => {
  assert.throws(
    () => resolveApiBaseUrl({ VERCEL: "1", VERCEL_ENV: "production" }),
    /API_BASE_URL is required/,
  );
});

test("rejects the production API origin in a preview", () => {
  assert.throws(
    () =>
      resolveApiBaseUrl({
        VERCEL: "1",
        VERCEL_ENV: "preview",
        API_BASE_URL: "https://api.example.com/api/v1",
        PRODUCTION_API_BASE_URL: "https://api.example.com/api/v1",
      }),
    /Preview cannot use the production API origin/,
  );
});

test("accepts an isolated preview API origin", () => {
  assert.equal(
    resolveApiBaseUrl({
      VERCEL: "1",
      VERCEL_ENV: "preview",
      API_BASE_URL: "https://api-staging.example.com/api/v1/",
      PRODUCTION_API_BASE_URL: "https://api.example.com/api/v1",
    }),
    "https://api-staging.example.com/api/v1",
  );
});
