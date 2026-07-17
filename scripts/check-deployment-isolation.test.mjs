import assert from "node:assert/strict";
import test from "node:test";
import { assertDistinctEnvironmentOrigins } from "./check-deployment-isolation.mjs";

const isolatedEnvironment = {
  STAGING_WEB_URL: "https://preview.example.com",
  PRODUCTION_WEB_URL: "https://app.example.com",
  STAGING_API_BASE_URL: "https://api-staging.example.com/api/v1",
  PRODUCTION_API_BASE_URL: "https://api.example.com/api/v1",
  STAGING_VISION_BASE_URL: "https://vision-staging.example.com",
  PRODUCTION_VISION_BASE_URL: "https://vision.example.com",
};

test("accepts distinct HTTPS origins", () => {
  assert.doesNotThrow(() =>
    assertDistinctEnvironmentOrigins(isolatedEnvironment),
  );
});

test("rejects a staging API on the production origin", () => {
  assert.throws(
    () =>
      assertDistinctEnvironmentOrigins({
        ...isolatedEnvironment,
        STAGING_API_BASE_URL: "https://api.example.com/staging",
      }),
    /must use different origins/,
  );
});

test("rejects non-HTTPS deployment URLs", () => {
  assert.throws(
    () =>
      assertDistinctEnvironmentOrigins({
        ...isolatedEnvironment,
        STAGING_WEB_URL: "http://preview.example.com",
      }),
    /must use HTTPS/,
  );
});
