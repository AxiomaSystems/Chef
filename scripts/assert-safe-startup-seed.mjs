#!/usr/bin/env node

import { assertSafeStartupSeed } from "./deployment-safety.mjs";

try {
  assertSafeStartupSeed();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
