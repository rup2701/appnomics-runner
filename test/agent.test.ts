// Runs the real agent loop against a fake model: one tool call, then a final answer.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { runAgent } from "../src/agent.js";
import { emptyUsage, costUsd } from "../src/config.js";

const dir = await mkdtemp(path.join(os.tmpdir(), "runner-agent-"));
const app = path.join(dir, "app");
await mkdir(app, { recursive: true });

const seenMarks: number[] = [];
let call = 0;
const fake = {
  messages: {
    async create(req: { messages: Anthropic.MessageParam[] }) {
      call++;
      let marks = 0;
      for (const m of req.messages) if (Array.isArray(m.content)) for (const b of m.content) if ((b as { cache_control?: unknown }).cache_control) marks++;
      seenMarks.push(marks);
      const usage = { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 1000, cache_creation_input_tokens: 0 };
      if (call === 1) {
        return { id: "msg_1", model: "fake", stop_reason: "tool_use", usage, content: [{ type: "tool_use", id: "t1", name: "write_file", input: { path: "hello.txt", content: "hi" } }] };
      }
      if (call === 2) {
        return { id: "msg_2", model: "fake", stop_reason: "tool_use", usage, content: [{ type: "tool_use", id: "t2", name: "write_file", input: { path: "specs/x", content: "no" } }] };
      }
      if (call === 3) {
        return { id: "msg_3", model: "fake", stop_reason: "tool_use", usage, content: [{ type: "tool_use", id: "t3", name: "write_file", input: { path: "AGENT_LOG.md", content: "log" } }] };
      }
      return { id: "msg_4", model: "fake", stop_reason: "end_turn", usage, content: [{ type: "text", text: "done" }] };
    },
  },
} as unknown as Anthropic;

const usage = emptyUsage();
const result = await runAgent({ client: fake, appDir: app, databaseUrl: "postgres://x/y", usage, transcriptPath: path.join(dir, "t.jsonl"), budgetUsedUsd: () => costUsd(usage) });
assert.equal(result.stopReason, "finished");
assert.equal(result.turns, 4);
assert.equal(usage.input, 400);
assert.ok(seenMarks.every((n) => n === 1), `exactly one cache mark per request, saw ${seenMarks}`);
assert.equal(await readFile(path.join(app, "hello.txt"), "utf8"), "hi");
const transcript = (await readFile(path.join(dir, "t.jsonl"), "utf8")).trim().split("\n").map((l) => JSON.parse(l));
assert.equal(transcript.find((t) => t.tool === "write_file" && t.error)?.output.includes("read-only"), true);
const calls = transcript.filter((x) => x.model_call);
assert.equal(calls.length, 4);
assert.equal(calls[0].model_call.id, "msg_1");
assert.equal(calls.reduce((n, c) => n + c.model_call.usage.output_tokens, 0), usage.output);
console.log("Agent loop checks passed.");

// Second scenario: a cut-off reply, then "done" without a log, then the real work.
{
  const d2 = await mkdtemp(path.join(os.tmpdir(), "runner-agent2-"));
  const app2 = path.join(d2, "app");
  await mkdir(app2, { recursive: true });
  let n = 0;
  const seen: string[] = [];
  const fake2 = {
    messages: {
      async create(req: { messages: Anthropic.MessageParam[] }) {
        n++;
        const last = req.messages[req.messages.length - 1];
        if (Array.isArray(last.content)) for (const b of last.content) if (b.type === "text") seen.push(b.text);
        const usage = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
        if (n === 1) return { id: "a", model: "fake", stop_reason: "max_tokens", usage, content: [{ type: "tool_use", id: "x", name: "write_file", input: { path: "big.ts" } }] };
        if (n === 2) return { id: "b", model: "fake", stop_reason: "end_turn", usage, content: [{ type: "text", text: "Here is my plan. Shall I proceed?" }] };
        if (n === 3) return { id: "c", model: "fake", stop_reason: "tool_use", usage, content: [{ type: "tool_use", id: "y", name: "write_file", input: { path: "AGENT_LOG.md", content: "log" } }] };
        return { id: "d", model: "fake", stop_reason: "end_turn", usage, content: [{ type: "text", text: "done" }] };
      },
    },
  } as unknown as Anthropic;
  const u2 = emptyUsage();
  const r2 = await runAgent({ client: fake2, appDir: app2, databaseUrl: "postgres://x/y", usage: u2, transcriptPath: path.join(d2, "t.jsonl"), budgetUsedUsd: () => 0 });
  assert.equal(r2.stopReason, "finished");
  assert.equal(r2.turns, 4);
  assert.ok(seen.some((s) => s.includes("cut off")), "cut-off message was sent");
  assert.ok(seen.some((s) => s.includes("AGENT_LOG.md does not exist")), "log nudge was sent");

  // An agent that never writes the log is stopped, not accepted.
  const d3 = await mkdtemp(path.join(os.tmpdir(), "runner-agent3-"));
  await mkdir(path.join(d3, "app"), { recursive: true });
  const lazy = { messages: { async create() { return { id: "z", model: "fake", stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: "text", text: "done" }] }; } } } as unknown as Anthropic;
  const r3 = await runAgent({ client: lazy, appDir: path.join(d3, "app"), databaseUrl: "postgres://x/y", usage: emptyUsage(), transcriptPath: path.join(d3, "t.jsonl"), budgetUsedUsd: () => 0 });
  assert.equal(r3.stopReason, "no_log");
  console.log("Cut-off and missing-log checks passed.");
}
