// The cost estimate uses the prices of the model that runs the build.
import assert from "node:assert/strict";

// With RUNNER_MODEL unset, builds use Opus 5.5 and its prices.
delete process.env.RUNNER_MODEL;
delete process.env.RUNNER_CHANGE_MODEL;
const { config, costUsd, pricesFor, PRICES, useModel } = await import("../src/config.js");

assert.equal(config.model, "claude-opus-5-5");
assert.deepEqual(config.prices, PRICES["claude-opus-5-5"]);
// One million tokens of each kind: 4 + 20 + 0.2 + 5.
assert.equal(costUsd({ input: 1e6, output: 1e6, cacheRead: 1e6, cacheWrite: 1e6 }).toFixed(2), "29.20");

assert.deepEqual(pricesFor("claude-opus-5-5"), { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 });
assert.deepEqual(pricesFor("claude-sonnet-5-5"), { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 });
// An unknown model is priced as Opus, so the cost limit is never too generous.
assert.deepEqual(pricesFor("claude-something-new"), PRICES["claude-opus-5-5"]);

// Site changes default to Sonnet 5.5, priced as Sonnet.
assert.equal(config.changeModel, "claude-sonnet-5-5");
useModel(config.changeModel);
assert.equal(config.model, "claude-sonnet-5-5");
assert.equal(costUsd({ input: 1e6, output: 1e6, cacheRead: 1e6, cacheWrite: 1e6 }).toFixed(2), "14.60");

console.log("config tests passed");
