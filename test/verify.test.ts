// The decision after approval: did the change fail the e2e checks, or could the checks not run? Unknown must count as "system".
import assert from "node:assert/strict";
import { judgeE2e } from "../src/verify.js";

const pass = judgeE2e(0, false, "  12 passed (41s)\n");
assert.deepEqual(pass, { ok: true });

const changeFailed = judgeE2e(1, false, "  1) [chromium] > e2e/hero.spec.ts:12:5 > hero button is visible\n  2 failed\n  10 passed (38s)\n");
assert.equal(changeFailed.ok, false);
assert.equal(!changeFailed.ok && changeFailed.kind, "change");
assert.match(!changeFailed.ok ? changeFailed.tail : "", /hero button/);

// Timed out, or killed: never the change's fault.
assert.equal(!judgeE2e(null, true, "2 failed").ok && (judgeE2e(null, true, "2 failed") as { kind: string }).kind, "system");

// Tests that could not start look like failures (exit 1) but are not about the change.
for (const out of [
  "browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium-1100/chrome-linux/chrome\n1 failed",
  "Error: listen EADDRINUSE: address already in use :::3100\n1 failed",
  "Error: Process from config.webServer was not able to start. Exit code: 1",
  "Error: Cannot find module 'next'",
  "Error: ENOSPC: no space left on device",
]) {
  const v = judgeE2e(1, false, out);
  assert.equal(!v.ok && v.kind, "system", out);
}

// Exit 1 and nothing that says tests failed: we do not know, so it is a system problem.
const unknown = judgeE2e(1, false, "something went wrong");
assert.equal(!unknown.ok && unknown.kind, "system");

// The tail is capped, and keeps the end of the output where the failures are.
const long = judgeE2e(1, false, "x".repeat(10000) + "\n3 failed");
assert.ok(!long.ok && long.tail.length <= 3000 && long.tail.endsWith("3 failed"));

console.log("verify: all passed");
