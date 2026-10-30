// Usage: npm run create -- "I want to sell my paintings online"
//   options: --brief path/to/brief.json   skip the stand-in and use this brief
//            --specs path/to/specs        default: vertical-packs/store/specs
//            --no-look-pass               skip the second pass that applies specs/look.md (put it after the prompt)
import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile, access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { config, costUsd, emptyUsage } from "./config.js";
import { standInBrief } from "./brief.js";
import { createWorkspace } from "./workspace.js";
import { runAgent, transcriptFile } from "./agent.js";
import { agentEnv } from "./tools.js";

const exec = promisify(execFile);

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const RESUME_MESSAGE = `This is a resumed run. An earlier session building this store ended early (for example a dropped connection). You have no memory of it, so work from the folder, not from guesses:
1. Run 'git log --oneline', 'git status', and list src/, e2e/ and scripts/ to see what exists. Read specs/ and specs/brief.json again as needed.
2. Run 'npx tsc --noEmit' and 'npm run build'. Fix what fails.
3. Run the end-to-end tests. Fix real bugs; do not weaken a test to make it pass.
4. Do not redo finished work. Continue the remaining stages (shopper side, owner area, one check per edge in specs/edges.json).
5. Write AGENT_LOG.md with the usual headings. Say plainly under 'Not verified' that the first session's notes were lost and that parts of the log are reconstructed from the files.`;

const LOOK_PASS_MESSAGE = `The site is built and tested. This is the look pass: make the public page follow specs/look.md exactly. You have no memory of building it, so work from the files.
1. Read specs/look.md and specs/brief.json (look.preset, brand words, accent). Read the public page code and its styles.
2. Go through look.md rule by rule (the rules for every preset, the grid table, the missing-image rules, the chosen preset, the moves from elite sites) and fix everything the page does not follow. In particular: grids follow the card-count table (four cards make a 2 by 2 grid on desktop, never 3 and 1); every benefit card has a lucide-react icon; the hero is full screen; missing images get the designed fallbacks (a CSS hero background, and an HTML mock-up in a window frame for the preview).
3. Do not change anything under /admin, the database, the API routes, authentication or uploads, and do not change the words from the brief. Keep every field and text.
4. Add the checks listed at the end of look.md to the end-to-end tests. Do not weaken an existing check.
5. Run 'npx tsc --noEmit', 'npm run build' and the full e2e suite. Fix what fails.
6. Commit. Then append a section headed 'Look pass' to AGENT_LOG.md listing each look.md rule and whether the page now follows it, and what you did not verify. Do not rewrite the earlier log.
Finish by replying with one short paragraph.`;

const changeMessage = (instruction: string, briefUpdated: boolean) => `This is a change to a store that is already built and working. You have no memory of building it, so work from the folder, not from guesses.
The change to make: ${instruction}
${briefUpdated ? "specs/brief.json has just been updated and is the source of truth for what this change should look like. Read it, compare it with what the code does today, and change only what the instruction covers.\n" : ""}Rules:
1. Before changing anything, run 'git log --oneline' and 'git status', and read AGENT_LOG.md and the code you need.
2. Change only what the instruction needs. Every other page and behaviour must stay exactly as it is, and its existing e2e checks must still pass. Do not restyle or refactor unrelated code.
3. If the change needs new fields or tables, add a Drizzle migration and update the seed so the sample data shows the change. The database is disposable and yours alone.
4. Add or update e2e checks for the changed behaviour. Do not weaken an existing check to make it pass.
5. Run 'npx tsc --noEmit', 'npm run build' and the full e2e suite. Fix what fails.
6. Commit the work. Then append a section to AGENT_LOG.md headed 'Change: ' plus a short title, with what changed, what you chose where the brief was unclear, and what you did not verify. Do not rewrite the earlier log.
Finish by replying with one short paragraph.`;

async function resume(runDir: string, message: string = RESUME_MESSAGE, label: string = "resume") {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Set ANTHROPIC_API_KEY");
  const root = path.resolve(runDir);
  const appDir = path.join(root, "app");
  const env = await readFile(path.join(appDir, ".env"), "utf8");
  const databaseUrl = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
  if (!databaseUrl) throw new Error(`No DATABASE_URL in ${appDir}/.env`);
  const usage = emptyUsage();
  const started = Date.now();
  console.log(`Resuming ${root}`);
  const result = await runAgent({
    client: new Anthropic(), appDir, databaseUrl, usage, firstMessage: message,
    transcriptPath: transcriptFile(root), budgetUsedUsd: () => costUsd(usage),
  });
  const check = async (args: string[]) => {
    try { await exec("npx", args, { cwd: appDir, env: agentEnv(databaseUrl), timeout: config.commandTimeoutMs, maxBuffer: 20_000_000 }); return true; }
    catch { return false; }
  };
  const summary = {
    resumedRun: path.basename(root), stopReason: result.stopReason, turns: result.turns,
    durationMinutes: Math.round((Date.now() - started) / 600) / 100,
    tokens: result.usage, estimatedCostUsd: Math.round(costUsd(result.usage) * 100) / 100,
    checks: { typecheck: await check(["tsc", "--noEmit"]), build: await check(["next", "build"]) },
    agentLogWritten: await access(path.join(appDir, "AGENT_LOG.md")).then(() => true, () => false),
    note: "This covers the resumed session only. Add it to the cost of the first session.",
  };
  await writeFile(path.join(root, `run-${label}.json`), JSON.stringify(summary, null, 2));
  console.log("\n" + JSON.stringify(summary, null, 2));
}

async function main() {
  if (process.argv[2] === "change") {
    const runDir = process.argv[3];
    const rest = process.argv.slice(4);
    const instruction = rest.filter((a, i) => !a.startsWith("--") && !rest[i - 1]?.startsWith("--")).join(" ").trim();
    if (!runDir || !instruction) throw new Error('Usage: npm run change -- runs/<run-folder> [--brief briefs/file.json] "what to change"');
    const root = path.resolve(runDir);
    const briefFile = arg("brief");
    if (briefFile) {
      const text = await readFile(path.resolve(briefFile), "utf8");
      JSON.parse(text); // refuse a broken brief
      await writeFile(path.join(root, "brief.json"), text);
      await writeFile(path.join(root, "app", "specs", "brief.json"), text);
    }
    return resume(runDir, changeMessage(instruction, Boolean(briefFile)), `change-${Date.now()}`);
  }
  if (process.argv[2] === "resume") {
    if (!process.argv[3]) throw new Error("Usage: npm run resume -- runs/<run-folder>");
    return resume(process.argv[3]);
  }
  const [cmd, ...rest] = process.argv.slice(2);
  const prompt = rest.filter((a, i) => !a.startsWith("--") && !rest[i - 1]?.startsWith("--")).join(" ").trim();
  if (cmd !== "create" || !prompt) {
    console.error('Usage: npm run create -- "I want to sell my paintings online" [--brief file] [--specs dir]');
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Set ANTHROPIC_API_KEY");

  const here = path.resolve(import.meta.dirname, "..");
  const specsDir = path.resolve(arg("specs") ?? path.join(here, "vertical-packs/store/specs"));
  const examplePath = path.join(here, "vertical-packs/store/brief.example.json");
  const client = new Anthropic();
  const usage = emptyUsage();
  const started = Date.now();

  console.log("1/4 Writing the brief…");
  const brief = arg("brief") ? JSON.parse(await readFile(arg("brief")!, "utf8")) : await standInBrief(client, prompt, examplePath, usage);
  const briefCost = costUsd(usage);

  console.log("2/4 Setting up a fresh folder and database…");
  const ws = await createWorkspace({ prompt, specsDir, brief, runsDir: path.join(here, "runs") });
  await writeFile(path.join(ws.root, "brief.json"), JSON.stringify(brief, null, 2));
  console.log(`    ${ws.appDir}\n    database ${ws.dbName}`);

  console.log("3/4 Agent is building (this takes a while)…");
  let result = await runAgent({
    client, appDir: ws.appDir, databaseUrl: ws.databaseUrl, usage,
    transcriptPath: transcriptFile(ws.root), budgetUsedUsd: () => costUsd(usage),
  });
  // Packs with a look file get a second, focused pass: a full build follows look rules far less closely than a short, single-purpose request does.
  const hasLook = await access(path.join(specsDir, "look.md")).then(() => true, () => false);
  if (hasLook && result.stopReason === "finished" && !process.argv.includes("--no-look-pass")) {
    console.log("3b/4 Look pass (the agent checks the public page against look.md)…");
    const lp = await runAgent({
      client, appDir: ws.appDir, databaseUrl: ws.databaseUrl, usage, firstMessage: LOOK_PASS_MESSAGE,
      transcriptPath: transcriptFile(ws.root), budgetUsedUsd: () => costUsd(usage),
    });
    result = { ...lp, turns: result.turns + lp.turns };
  }

  console.log("4/4 Independent checks (the agent does not run these)…");
  const built = await access(path.join(ws.appDir, "package.json")).then(() => true, () => false);
  const check = async (args: string[]) => {
    if (!built) return false; // nothing to check: report a failure, not a pass
    try {
      await exec("npx", args, { cwd: ws.appDir, env: agentEnv(ws.databaseUrl), timeout: config.commandTimeoutMs, maxBuffer: 20_000_000 });
      return true;
    } catch { return false; }
  };
  const tsc = await check(["tsc", "--noEmit"]);
  const build = await check(["next", "build"]);
  const agentLog = await access(path.join(ws.appDir, "AGENT_LOG.md")).then(() => true, () => false);

  const summary = {
    runId: ws.runId, prompt, model: config.model, stopReason: result.stopReason, turns: result.turns,
    durationMinutes: Math.round((Date.now() - started) / 600) / 100,
    tokens: result.usage, estimatedCostUsd: Math.round(costUsd(result.usage) * 100) / 100,
    briefStepCostUsd: Math.round(briefCost * 1000) / 1000,
    checks: { typecheck: tsc, build }, builtAnything: built, agentLogWritten: agentLog, appDir: ws.appDir, database: ws.dbName,
    note: "Cost is an estimate from token counts and the prices in src/config.ts.",
  };
  await writeFile(path.join(ws.root, "run.json"), JSON.stringify(summary, null, 2));
  console.log("\n" + JSON.stringify(summary, null, 2));
  console.log(`\nRead ${path.join(ws.appDir, "AGENT_LOG.md")} first. To see the store: cd ${ws.appDir} && npm run dev`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
