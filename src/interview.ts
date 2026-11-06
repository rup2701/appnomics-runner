// Usage: npm run interview -- --pack site [--idea "one sentence"] [--out briefs/name.json]
// A chat in the terminal. The pack's interview.md seeds the questions; the result is a brief.json
// for the runner. Type /quit to stop. Needs ANTHROPIC_API_KEY.
import Anthropic from "@anthropic-ai/sdk";
import readline from "node:readline/promises";
import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { config, costUsd, emptyUsage, addUsage } from "./config.js";

const REQUIRED: Record<string, string[]> = {
  site: ["site", "audience", "blocks", "look"],
  saas: ["site", "audience", "brand", "main_button", "blocks", "look"],
  store: ["store", "categories", "look", "orders"],
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "brief";

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Set ANTHROPIC_API_KEY (source ~/.appnomics/keys.env)");
  const pack = arg("pack") ?? "site";
  if (!REQUIRED[pack]) throw new Error(`Unknown pack "${pack}". Known: ${Object.keys(REQUIRED).join(", ")}`);
  const here = path.resolve(import.meta.dirname, "..");
  const packDir = path.join(here, "vertical-packs", pack);
  const interviewMd = await readFile(path.join(packDir, "interview.md"), "utf8").catch(() => {
    throw new Error(`No interview file for the "${pack}" pack yet (expected ${path.join(packDir, "interview.md")}).`);
  });
  const example = await readFile(path.join(packDir, "brief.example.json"), "utf8");

  const system = `You are the interview agent of an AI app builder. You talk with a founder in plain, friendly words and, at the end, save a brief.json that the builder uses to build their ${pack === "site" ? "waitlist website" : pack === "saas" ? "product website" : "store"}. The builder never sees this conversation, only the brief.

Follow this interview guide exactly (its questions, defaults, rules and review step):

<interview_guide>
${interviewMd}
</interview_guide>

The brief must have the same shape as this example. Copy every part that is not about this person's idea (not_in_this_version, owner, storage, stack, look.layout and similar) unchanged, and replace everything that is about their idea:

<example_brief>
${example}
</example_brief>

How to talk:
- One question per message, at most three short sentences, no lists of questions.
- Keep the person's own words in the brief where you can. You write the headline, benefit titles and thank-you message, and the person approves them on the review.
- Never invent proof (customer counts, logos, testimonials, certifications). Claims go in "claims" with "confirmed": false unless the person says they are true.
- When you have enough, show the review screen as a short readable summary (not JSON): headline, subheadline, benefits, form fields, look, the defaults you chose, and the claims marked unconfirmed. Ask if they want to change anything.
- Only after they approve the review, call save_brief with the complete brief. If the tool returns an error, fix the brief and call it again.
- After the brief is saved, say in one or two sentences what happens next.`;

  const client = new Anthropic();
  const usage = emptyUsage();
  const maxCost = Number(process.env.INTERVIEW_MAX_COST_USD ?? 1);
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: arg("idea") ? `Start the interview. My idea: ${arg("idea")}` : "Start the interview." },
  ];
  const transcript: string[] = [];
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let savedPath: string | null = null;

  while (!savedPath) {
    if (costUsd(usage) > maxCost) throw new Error(`Stopped: the interview passed $${maxCost}.`);
    const res = await client.messages.create({
      model: config.model,
      max_tokens: 8000,
      system,
      tools: [{
        name: "save_brief",
        description: "Save the finished brief.json. Call only after the person approved the review.",
        input_schema: { type: "object", properties: { brief: { type: "object", description: "The complete brief" } }, required: ["brief"] },
      }],
      messages,
    });
    addUsage(usage, res.usage);
    messages.push({ role: "assistant", content: res.content });

    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    if (text) { console.log(`\nInterviewer: ${text}\n`); transcript.push(`**Interviewer:** ${text}`); }

    const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (toolUses.length) {
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const brief = (tu.input as { brief?: Record<string, unknown> }).brief;
        const missing = brief ? REQUIRED[pack].filter((k) => !(k in brief)) : REQUIRED[pack];
        if (!brief || missing.length) {
          results.push({ type: "tool_result", tool_use_id: tu.id, is_error: true, content: `The brief is missing: ${missing.join(", ")}. Fix it and call save_brief again.` });
          continue;
        }
        brief.source = { generated_by: "interview", pack, model: config.model };
        const name = (brief.site as { name?: string } | undefined)?.name ?? (brief.store as { name?: string } | undefined)?.name ?? "brief";
        savedPath = path.resolve(arg("out") ?? path.join(here, "briefs", `${slug(name)}.json`));
        // Never overwrite an existing brief: add -2, -3, ... to the file name.
        const taken = async (f: string) => access(f).then(() => true, () => false);
        const base = savedPath.replace(/\.json$/, "");
        for (let n = 2; await taken(savedPath); n++) savedPath = `${base}-${n}.json`;
        await writeFile(savedPath, JSON.stringify(brief, null, 2) + "\n");
        await writeFile(savedPath.replace(/\.json$/, ".interview.md"), `# Interview for ${name}\n\n${transcript.join("\n\n")}\n`);
        results.push({ type: "tool_result", tool_use_id: tu.id, content: `Saved to ${savedPath}. Tell the person what happens next.` });
      }
      messages.push({ role: "user", content: results });
      continue; // let the model say its closing words
    }

    if (res.stop_reason === "max_tokens") { messages.push({ role: "user", content: "Please continue." }); continue; }
    const answer = (await rl.question("You: ")).trim();
    if (answer === "/quit") break;
    transcript.push(`**Person:** ${answer}`);
    messages.push({ role: "user", content: answer || "(no answer)" });
  }
  rl.close();

  console.log(`\nInterview cost (estimate): $${costUsd(usage).toFixed(2)}`);
  if (savedPath) {
    const name = path.basename(savedPath, ".json");
    console.log(`Brief saved: ${savedPath}\nTranscript: ${savedPath.replace(/\.json$/, ".interview.md")}`);
    console.log(`\nBuild it:\nnpm run create -- "A waitlist website for ${name}" --specs vertical-packs/${pack}/specs --brief ${path.relative(process.cwd(), savedPath)}`);
  } else console.log("No brief was saved.");
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
