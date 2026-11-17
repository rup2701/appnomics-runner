// Quick checks that the tools hold their limits. Run: npm test
import assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { makeHandlers, checkCommand, inside, agentEnv } from "../src/tools.js";
import { createWorkspace } from "../src/workspace.js";

const dir = await mkdtemp(path.join(os.tmpdir(), "runner-test-"));
const app = path.join(dir, "app");
await mkdir(path.join(app, "specs"), { recursive: true });
const h = makeHandlers(app, { PATH: process.env.PATH ?? "" });

assert.throws(() => inside(app, "../outside.txt"), /escapes/);
assert.throws(() => inside(app, "/etc/passwd"), /escapes/);
await assert.rejects(h.write_file({ path: "specs/contract.md", content: "x" }), /read-only/);
await assert.rejects(h.write_file({ path: ".git/config", content: "x" }), /read-only/);
await h.write_file({ path: "src/a.ts", content: "hello\nworld" });
assert.match(await h.read_file({ path: "src/a.ts" }), /1\thello\n2\tworld/);
assert.match(await h.list_files({ path: "." }), /src\//);

assert.equal(checkCommand("rm", ["-rf", "/"]), "rm is not an allowed command");
assert.match(checkCommand("npm", ["publish"]) ?? "", /not allowed/);
assert.match(checkCommand("npx", ["-y", "evil-package"]) ?? "", /not allowed/);
assert.match(checkCommand("git", ["push"]) ?? "", /not allowed/);
assert.equal(checkCommand("npx", ["tsc", "--noEmit"]), null);
assert.equal(checkCommand("npm", ["run", "build"]), null);
await assert.rejects(h.run_command({ command: "curl", args: ["https://example.com"] }), /not an allowed/);
assert.match(await h.run_command({ command: "node", args: ["-e", "console.log(40+2)"] }), /exit code: 0\n42/);

// Workspace: folder, specs copy, brief, git commit (database skipped here).
const ws = await createWorkspace({
  prompt: "I want to sell my paintings online", specsDir: path.resolve(import.meta.dirname, "../vertical-packs/store/specs"),
  brief: { store: { name: "Test" } }, runsDir: path.join(dir, "runs"), skipDb: true,
});
const wh = makeHandlers(ws.appDir, { PATH: process.env.PATH ?? "" });
assert.match(await wh.read_file({ path: "specs/brief.json" }), /Test/);
assert.match(await wh.run_command({ command: "git", args: ["log", "--oneline"] }), /Specs and brief/);

// The agent can commit with only the worker's GIT_ names, as on Fly, where the home folder has no git identity.
// Keys are still kept out of the agent's commands.
{
  const saved = { ...process.env };
  const emptyHome = await mkdtemp(path.join(os.tmpdir(), "runner-home-"));
  Object.assign(process.env, {
    HOME: emptyHome, GIT_CONFIG_GLOBAL: path.join(emptyHome, "none"), GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "Appnomics", GIT_AUTHOR_EMAIL: "builder@appnomics.dev",
    GIT_COMMITTER_NAME: "Appnomics", GIT_COMMITTER_EMAIL: "builder@appnomics.dev",
    ANTHROPIC_API_KEY: "test-not-a-key",
  });
  const env = agentEnv("");
  assert.equal(env.GIT_AUTHOR_NAME, "Appnomics");
  assert.equal(env.GIT_COMMITTER_EMAIL, "builder@appnomics.dev");
  assert.equal(env.ANTHROPIC_API_KEY, undefined);
  // agentEnv does not pass GIT_CONFIG_GLOBAL, so git reads the empty home folder: no identity but the GIT_ names.
  const gh = makeHandlers(ws.appDir, env);
  await gh.write_file({ path: "committed.txt", content: "yes" });
  await gh.run_command({ command: "git", args: ["add", "committed.txt"] });
  const out = await gh.run_command({ command: "git", args: ["commit", "-m", "Agent commit"] });
  assert.doesNotMatch(out, /Author identity unknown|Please tell me who you are/);
  assert.match(await gh.run_command({ command: "git", args: ["log", "-1", "--format=%an <%ae> %s"] }), /Appnomics <builder@appnomics\.dev> Agent commit/);
  process.env = saved;
}
console.log("All tool and workspace checks passed.");
