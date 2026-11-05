#!/usr/bin/env node
/**
 * Where a build's time went. Usage: node scripts/time-breakdown.mjs runs/<run>/transcript.jsonl
 *
 * Each transcript line is written when a tool call ends: `t` is that moment and `ms` is how long the tool ran.
 * So the wait before a call started (the previous call's end to this call's start) is the model thinking and
 * writing, and `ms` is the tools. The time before the first call and after the last one is not in the log.
 */
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/time-breakdown.mjs runs/<run>/transcript.jsonl");
  process.exit(1);
}
const rows = readFileSync(file, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l))
  .filter((r) => r.t && typeof r.ms === "number")
  .map((r) => ({ ...r, end: Date.parse(r.t) }))
  .sort((a, b) => a.end - b.end);
if (rows.length < 2) {
  console.error("Not enough entries to measure.");
  process.exit(1);
}

const min = (ms) => (ms / 60000).toFixed(1);
const kind = (r) => {
  if (r.tool !== "run_command") return r.tool;
  const cmd = [r.input?.command, ...(r.input?.args ?? [])].join(" ");
  if (/\bnpm (install|ci)\b/.test(cmd)) return "npm install";
  if (/\bnext build\b|run build/.test(cmd)) return "next build";
  if (/\btsc\b|typecheck/.test(cmd)) return "typecheck";
  if (/playwright|screenshot|e2e/.test(cmd)) return "browser / screenshots";
  if (/drizzle|db:|migrate|seed/.test(cmd)) return "database";
  if (/\btest\b|vitest|jest/.test(cmd)) return "tests";
  return "other commands";
};

let model = 0;
let tools = 0;
const byKind = new Map();
const slowTools = [];
const slowModel = [];
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  tools += r.ms;
  const k = kind(r);
  const e = byKind.get(k) ?? { ms: 0, n: 0 };
  e.ms += r.ms;
  e.n++;
  byKind.set(k, e);
  slowTools.push({ ms: r.ms, turn: r.turn, what: `${k}: ${r.tool === "run_command" ? [r.input?.command, ...(r.input?.args ?? [])].join(" ").slice(0, 70) : (r.input?.path ?? "")}` });
  if (i > 0) {
    const gap = r.end - r.ms - rows[i - 1].end;
    if (gap > 0) {
      model += gap;
      slowModel.push({ ms: gap, turn: r.turn, what: `before ${r.tool} ${r.input?.path ?? ""}`.trim() });
    }
  }
}
const measured = rows[rows.length - 1].end - rows[0].end + rows[0].ms;
const pct = (x) => `${Math.round((x / measured) * 100)}%`;

console.log(`Measured span: ${min(measured)} min, ${rows.length} tool calls, ${new Set(rows.map((r) => r.turn)).size} turns`);
console.log(`  Model (thinking and writing between calls): ${min(model)} min (${pct(model)})`);
console.log(`  Tools (commands and file work):             ${min(tools)} min (${pct(tools)})\n`);
console.log("Tool time by kind:");
for (const [k, v] of [...byKind].sort((a, b) => b[1].ms - a[1].ms)) console.log(`  ${k.padEnd(24)} ${min(v.ms).padStart(6)} min  ${String(v.n).padStart(4)} calls`);
console.log("\nSlowest tool calls:");
for (const s of slowTools.sort((a, b) => b.ms - a.ms).slice(0, 8)) console.log(`  turn ${String(s.turn).padStart(3)}  ${(s.ms / 1000).toFixed(0).padStart(4)} s  ${s.what}`);
console.log("\nSlowest model waits:");
for (const s of slowModel.sort((a, b) => b.ms - a.ms).slice(0, 8)) console.log(`  turn ${String(s.turn).padStart(3)}  ${(s.ms / 1000).toFixed(0).padStart(4)} s  ${s.what}`);
