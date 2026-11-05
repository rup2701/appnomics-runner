import { readFileSync } from "node:fs";
const rows = readFileSync(process.argv[2], "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
for (const r of rows) {
  const cmd = [r.input?.command, ...(r.input?.args ?? [])].join(" ");
  if (r.tool !== "run_command" || !/playwright/.test(cmd)) continue;
  const out = String(r.output ?? "");
  const summary = out.split("\n").filter((l) => /passed|failed|flaky|✘|Error:|expect\(/.test(l)).slice(0, 4).join(" | ").slice(0, 300);
  console.log(`turn ${r.turn}  ${Math.round(r.ms / 1000)}s  ${cmd.replace("npx playwright test", "pw").slice(0, 60)}\n    ${summary || "(no summary in the first 2000 chars)"}`);
}
