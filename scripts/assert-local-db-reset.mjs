#!/usr/bin/env node

import { assertLocalDatabaseReset, loadRootEnv } from "./deployment-safety.mjs";

loadRootEnv();

try {
  assertLocalDatabaseReset();
  console.log("[DB SAFETY] Confirmed local database target.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
