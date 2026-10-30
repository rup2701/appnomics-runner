// Quick checks that the tools hold their limits. Run: npm test
import assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { makeHandlers, checkCommand, inside } from "../src/tools.js";
import { createWorkspace } from "../src/workspace.js";

const dir = await mkdtemp(path.join(os.tmpdir(), "runner-test-"));
const app = path.join(dir, "app");
await mkdir(path.join(app, "specs"), { recursive: true });
const h = makeHandlers(app, { PATH: process.env.PATH ?? "" });

assert.throws(() => inside(app, "../outside.txt"), /escapes/);
assert.throws(() => inside(app, "/etc/passwd"), /escapes/);
await assert.rejects(h.write_file({ path: "specs/vision.md", content: "x" }), /read-only/);
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
console.log("All tool and workspace checks passed.");
