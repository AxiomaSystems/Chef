import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import { createProcessRunner } from "../src/pg-runtime.mjs";

function fakeChild() {
  const child = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kills = [];
  child.kill = (signal) => child.kills.push(signal);
  return child;
}

test("process runner resolves success and redacts credential URLs from stderr", async () => {
  const child = fakeChild();
  const runner = createProcessRunner({ spawnImpl: () => child });
  const ok = runner("tool", ["arg"], { env: {}, timeoutMs: 10 });
  child.emit("close", 0);
  await ok;

  const failing = runner("tool", [], { env: {}, timeoutMs: 10 });
  child.stderr.emit("data", Buffer.from("postgresql://user:secret@example/db"));
  child.emit("close", 1);
  await assert.rejects(failing, (error) => !error.message.includes("secret") && error.message.includes("[REDACTED_URL]"));
});

test("process runner propagates spawn errors", async () => {
  const child = fakeChild();
  const runner = createProcessRunner({ spawnImpl: () => child });
  const pending = runner("tool", [], { env: {}, timeoutMs: 10 });
  child.emit("error", new Error("spawn unavailable"));
  await assert.rejects(pending, /spawn unavailable/);
});

test("process runner sends deterministic TERM then KILL after timeout", async () => {
  const child = fakeChild();
  const callbacks = [];
  const runner = createProcessRunner({
    spawnImpl: () => child,
    setTimeoutImpl(callback) { callbacks.push(callback); return { unref() {} }; },
    clearTimeoutImpl() {},
  });
  const pending = runner("tool", [], { env: {}, timeoutMs: 1 });
  callbacks.shift()();
  callbacks.shift()();
  child.emit("close", null);
  await assert.rejects(pending, /timed out/);
  assert.deepEqual(child.kills, ["SIGTERM", "SIGKILL"]);
});
