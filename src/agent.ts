// The agent loop: ask the model, run the tools it asks for, show it the results, repeat.
// Stops when the model finishes, or when a turn or cost cap is reached.
import Anthropic from "@anthropic-ai/sdk";
import { appendFile, access } from "node:fs/promises";
import path from "node:path";
import { config, costUsd, addUsage, type Usage } from "./config.js";
import { toolDefs, makeHandlers, agentEnv } from "./tools.js";

const BASE_PROMPT = `You are the builder agent for an AI app builder. You are given a folder with specs/ (the files for this kind of app) and specs/brief.json (the facts about this one app). Build the app they describe, whether it is a store or a website.

How to work:
- Read specs/contract.md (the contract for this kind of app; older runs call it specs/vision.md), specs/stack.json, specs/requirements.json, specs/experience.json, specs/domain-model.json, specs/edges.json, specs/SPEC_GAPS.md and specs/brief.json first, and specs/look.md if it exists (it holds the look rules and checks; follow them). The stack decisions are fixed; do not reopen them.
- The brief overrides anything specific to one product in the specs (name, what is sold, categories, look, sample products). Where the specs mention handmade goods or an example product, follow the brief instead. Read 'shopper' as 'visitor' and 'store' as 'site' when the pack is a website.
- The brief may ask for things the specs do not describe (for example brands, collections, stores and pickup, per-size stock, an announcement bar, an email signup, a different header and home layout). Build them anyway, in the same style and with the same rigor as the rest, and add a check for each one. For every such item, add a line under the heading 'Beyond the specs' in AGENT_LOG.md saying what you built and which choices you made. If the brief and the specs conflict, the brief wins for this app.
- specs/ is read-only. If the specs are unclear, missing or contradict each other, choose the simplest reading and record it in AGENT_LOG.md. Do not ask questions; nobody is there to answer.
- DATABASE_URL is already in .env. The database is empty and yours alone.
- Build in stages and verify each one: (1) scaffold, database schema and seed data from the brief, (2) the public side (what shoppers or visitors see), (3) the owner area, (4) end-to-end tests with one check per edge in specs/edges.json. Run 'npx tsc --noEmit' and 'npm run build' after each stage and fix what fails.
- Keep commands short. Install packages with npm. A command has a time limit of ten minutes.
- When the work is done, write AGENT_LOG.md at the root with these headings: What I built and where; Beyond the specs; Decisions on ambiguous points; Not verified; Unclear, missing or misleading in the specs; Mistakes made and fixed; Final results (the exact commands you ran and what they printed).
- Never claim a check passed unless you ran it and saw it pass. Finish by replying with one short paragraph.`;

const DB_LINE = "- DATABASE_URL is already in .env. The database is empty and yours alone.";
const STAGES_LINE = "(1) scaffold, database schema and seed data from the brief, (2) the public side (what shoppers or visitors see), (3) the owner area, (4) end-to-end tests";
// A static site (the product showcase pack) has no database, no owner area and no environment variables.
export const staticPrompt = (p: string) =>
  p.replace(DB_LINE, "- This is a static site: no database, no API routes, no environment variables, no owner area. Page content comes from src/content/site.ts, written from the brief. Ignore any mention of a database in the instructions above.")
   .replace(STAGES_LINE, "(1) scaffold and the content file from the brief, (2) the public page (every section in the brief's page_plan), (3) end-to-end tests");
export const SYSTEM_PROMPT = BASE_PROMPT;

/** Where the agent's time went, in milliseconds: waiting for the model, running tools, and, as parts of the tool time, running tests and running build or type checks. Reset by the caller before a run. */
export const agentClock = { modelMs: 0, toolMs: 0, testMs: 0, buildMs: 0 };
const TEST_COMMAND = /playwright|e2e|\btest\b|vitest|jest/i;
const BUILD_COMMAND = /\bbuild\b|tsc/i;

type Result = { turns: number; stopReason: "finished" | "max_turns" | "max_cost" | "cut_off" | "no_log"; usage: Usage };

// Keep one cache breakpoint on the newest message so earlier turns are read from cache.
function moveCacheMark(messages: Anthropic.MessageParam[]): void {
  for (const m of messages) {
    if (m.role === "user" && Array.isArray(m.content)) {
      for (const b of m.content) delete (b as { cache_control?: unknown }).cache_control;
    }
  }
  const last = messages[messages.length - 1];
  if (last && Array.isArray(last.content) && last.content.length > 0) {
    (last.content[last.content.length - 1] as { cache_control?: unknown }).cache_control = { type: "ephemeral" };
  }
}

export async function runAgent(opts: {
  client: Anthropic; appDir: string; databaseUrl: string; usage: Usage; transcriptPath: string; budgetUsedUsd: () => number;
  firstMessage?: string; // used by resume
  staticSite?: boolean; // no database or owner area
}): Promise<Result> {
  const handlers = makeHandlers(opts.appDir, agentEnv(opts.databaseUrl)) as Record<string, (i: never) => Promise<string>>;
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: [{ type: "text", text: opts.firstMessage ?? "Build the store. The folder is ready. Start by reading the specs." }] },
  ];
  let cutOffInARow = 0;
  let nudges = 0;
  const exists = (f: string) => access(f).then(() => true, () => false);
  const log = (line: object) => appendFile(opts.transcriptPath, JSON.stringify({ t: new Date().toISOString(), ...line }) + "\n");

  for (let turn = 1; turn <= config.maxTurns; turn++) {
    if (opts.budgetUsedUsd() >= config.maxCostUsd) return { turns: turn - 1, stopReason: "max_cost", usage: opts.usage };
    moveCacheMark(messages);
    // A dropped connection should pause the run, not end it. Wait and retry for up to about 15 minutes.
    let res: Anthropic.Message | undefined;
    const modelStarted = Date.now();
    for (let attempt = 1; !res; attempt++) {
      try {
        res = await opts.client.messages.create({
          model: config.model,
          max_tokens: 20000,
          system: [{ type: "text", text: opts.staticSite ? staticPrompt(SYSTEM_PROMPT) : SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          tools: toolDefs,
          messages,
        });
      } catch (err) {
        const retryable = err instanceof Anthropic.APIConnectionError || (err instanceof Anthropic.APIError && (err.status === undefined || err.status >= 500 || err.status === 429));
        if (!retryable || attempt > 15) throw err;
        const waitSec = Math.min(60, 5 * attempt);
        await log({ turn, connection_problem: String(err instanceof Error ? err.message : err), retry_in_seconds: waitSec, attempt });
        console.log(`  connection problem, retrying in ${waitSec}s (attempt ${attempt})`);
        await new Promise((r) => setTimeout(r, waitSec * 1000));
      }
    }
    agentClock.modelMs += Date.now() - modelStarted;
    addUsage(opts.usage, res.usage);
    // One line per model call, with the response id, so a run can be matched against the console's usage page.
    await log({ turn, model_call: { id: res.id, model: res.model, stop_reason: res.stop_reason, usage: res.usage } });

    // The reply was cut off by the length limit. Any tool call in it is incomplete and is dropped.
    if (res.stop_reason === "max_tokens") {
      cutOffInARow++;
      await log({ turn, cut_off: true, in_a_row: cutOffInARow });
      if (cutOffInARow >= 3) return { turns: turn, stopReason: "cut_off", usage: opts.usage };
      const kept = res.content.filter((b) => b.type !== "tool_use");
      messages.push({ role: "assistant", content: kept.length ? kept : [{ type: "text", text: "(reply cut off)" }] });
      messages.push({ role: "user", content: [{ type: "text", text:
        "Your last reply was cut off because it was too long, and any tool call in it was lost. Continue in smaller steps: " +
        "one file per write_file call, no file longer than about 300 lines (split big files into several), and no long plans in text." }] });
      continue;
    }
    cutOffInARow = 0;
    messages.push({ role: "assistant", content: res.content });

    if (res.stop_reason !== "tool_use") {
      const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      await log({ turn, final: text, stop_reason: res.stop_reason });
      // Do not accept "done" until the log exists. Nudge twice, then give up.
      if (!(await exists(path.join(opts.appDir, "AGENT_LOG.md")))) {
        if (nudges >= 2) return { turns: turn, stopReason: "no_log", usage: opts.usage };
        nudges++;
        messages.push({ role: "user", content: [{ type: "text", text:
          "You have not finished: AGENT_LOG.md does not exist yet. Nobody is available to answer questions or approve a plan. " +
          "Continue building with your tools, run the checks, and write AGENT_LOG.md before you stop." }] });
        continue;
      }
      return { turns: turn, stopReason: "finished", usage: opts.usage };
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of res.content) {
      if (block.type !== "tool_use") continue;
      const started = Date.now();
      let output: string;
      let isError = false;
      try {
        const handler = handlers[block.name];
        if (!handler) throw new Error(`Unknown tool ${block.name}`);
        output = await handler(block.input as never);
      } catch (err) {
        output = String(err instanceof Error ? err.message : err);
        isError = true;
      }
      const toolMs = Date.now() - started;
      agentClock.toolMs += toolMs;
      if (block.name === "run_command") {
        const cmd = JSON.stringify(block.input ?? {});
        if (TEST_COMMAND.test(cmd)) agentClock.testMs += toolMs;
        else if (BUILD_COMMAND.test(cmd)) agentClock.buildMs += toolMs;
      }
      console.log(`[${turn}] ${block.name} ${summarize(block.input)}${isError ? "  (error)" : ""}`);
      await log({ turn, tool: block.name, input: block.input, ms: toolMs, error: isError, output: output.slice(0, 2000) });
      results.push({ type: "tool_result", tool_use_id: block.id, content: output, is_error: isError });
    }
    messages.push({ role: "user", content: results });
  }
  return { turns: config.maxTurns, stopReason: "max_turns", usage: opts.usage };
}

function summarize(input: unknown): string {
  const i = input as { path?: string; command?: string; args?: string[] };
  // The model sometimes sends args as a string or object; this line must never throw.
  if (i.command) return `${i.command} ${Array.isArray(i.args) ? i.args.join(" ") : String(i.args ?? "")}`.slice(0, 100);
  return (i.path ?? "").slice(0, 100);
}

export const transcriptFile = (root: string) => path.join(root, "transcript.jsonl");
