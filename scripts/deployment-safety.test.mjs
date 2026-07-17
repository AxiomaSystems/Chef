import assert from "node:assert/strict";
import test from "node:test";
import {
  assertLocalDatabaseReset,
  assertSafeStartupSeed,
} from "./deployment-safety.mjs";

test("allows reset for the local Docker database", () => {
  assert.doesNotThrow(() =>
    assertLocalDatabaseReset({
      DEPLOYMENT_ENVIRONMENT: "local",
      DATABASE_URL:
        "postgresql://postgres:postgres@localhost:5433/cart_generator",
    }),
  );
});

test("rejects reset for a remote database", () => {
  assert.throws(
    () =>
      assertLocalDatabaseReset({
        DEPLOYMENT_ENVIRONMENT: "local",
        DATABASE_URL: "postgresql://user:password@db.example.com:5432/preppie",
      }),
    /refused non-local database host/,
  );
});

test("rejects reset outside local or test", () => {
  assert.throws(
    () =>
      assertLocalDatabaseReset({
        DEPLOYMENT_ENVIRONMENT: "production",
        DATABASE_URL:
          "postgresql://postgres:postgres@localhost:5433/cart_generator",
      }),
    /local-only/,
  );
});

test("allows automatic seed only in staging", () => {
  assert.doesNotThrow(() =>
    assertSafeStartupSeed({
      DEPLOYMENT_ENVIRONMENT: "staging",
      RUN_DB_SEED_ON_STARTUP: "true",
    }),
  );
  assert.throws(
    () =>
      assertSafeStartupSeed({
        DEPLOYMENT_ENVIRONMENT: "production",
        RUN_DB_SEED_ON_STARTUP: "true",
      }),
    /allowed only in staging/,
  );
});
