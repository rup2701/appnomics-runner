// PR B: --theme. The Visual design tokens from the Builder become the site's src/theme.ts before the agent starts.
// Without --theme, or with a wrong file, the run is exactly as before. The fixture is a real token set from the Builder's
// designTokens function.
import assert from "node:assert/strict";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createWorkspace, writeTheme } from "../src/workspace.js";
import { readThemeTokens, themeTokensProblem, THEME_INSTRUCTION, type ThemeTokens } from "../src/theme-tokens.js";
import { staticPrompt, SYSTEM_PROMPT, systemPrompt } from "../src/agent.js";

const root = path.resolve(import.meta.dirname, "..");
const specsDir = path.join(root, "vertical-packs/product-showcase/specs");
const pass = (name: string) => console.log(`PASS ${name}`);
const exists = (f: string) => access(f).then(() => true, () => false);
const fixture = path.join(import.meta.dirname, "fixtures/theme-tokens.json");
const TOKENS = JSON.parse(await readFile(fixture, "utf8")) as ThemeTokens;
const dir = await mkdtemp(path.join(os.tmpdir(), "runner-theme-"));

// Tokens present: src/theme.ts holds the tokens as they are and the creative.md direction filled in from them.
{
  const ws = await createWorkspace({ prompt: "theme on", specsDir, brief: { site: { name: "Test" } }, runsDir: dir, skipDb: true, theme: TOKENS });
  assert.equal(ws.themeWritten, true);
  const file = path.join(ws.appDir, "src/theme.ts");
  const mod = await import(pathToFileURL(file).href);
  assert.deepEqual(mod.tokens, TOKENS);
  assert.deepEqual(mod.direction, {
    pairing: TOKENS.direction.pairing, headingFont: TOKENS.font.heading, bodyFont: TOKENS.font.body, accentFont: TOKENS.font.accent,
    headingWeight: TOKENS.font.weight.headline, capsLabels: TOKENS.font.capsLabels, motif: TOKENS.direction.motif,
    heroKind: TOKENS.direction.heroKind, heroLayout: TOKENS.direction.heroLayout, signatures: TOKENS.direction.signatures,
  });
  assert.match(await readFile(file, "utf8"), /export const tokens = \{[\s\S]*\} as const;[\s\S]*export const direction = \{/);
  pass("with tokens, src/theme.ts holds them and the direction filled in from them, before the agent starts");
}

// Tokens absent: no src folder at all, as today.
{
  const ws = await createWorkspace({ prompt: "theme off", specsDir, brief: { site: { name: "Test" } }, runsDir: dir, skipDb: true });
  assert.equal(ws.themeWritten, false);
  assert.equal(await exists(path.join(ws.appDir, "src")), false);
  pass("without --theme nothing is written");
}

// Bad shape: logged, no file.
{
  const lines: string[] = [];
  const app = await mkdtemp(path.join(os.tmpdir(), "runner-theme-bad-"));
  const bad = { ...TOKENS, color: { ...(TOKENS as any).color, accent: "orange" } } as ThemeTokens;
  assert.equal(await writeTheme(app, bad, (l) => lines.push(l)), false);
  assert.equal(await exists(path.join(app, "src/theme.ts")), false);
  assert.match(lines.join("\n"), /theme tokens not used: wrong shape \(color\.accent\)/);
  assert.equal(themeTokensProblem({ ...TOKENS, font: { ...(TOKENS as any).font, heading: "Inter\"; x" } }), "font.heading");
  assert.equal(themeTokensProblem({ ...TOKENS, later: [1] }), null, "extra fields from a newer Builder are fine");
  pass("tokens with the wrong shape are logged and not written");
}

// The --theme file: missing, not JSON, wrong shape, good.
{
  const notJson = path.join(dir, "not.json");
  await writeFile(notJson, "{ nope");
  const wrong = path.join(dir, "wrong.json");
  await writeFile(wrong, JSON.stringify({ version: 2 }));
  assert.match((await readThemeTokens(path.join(dir, "missing.json")) as { problem: string }).problem, /could not read/);
  assert.match((await readThemeTokens(notJson) as { problem: string }).problem, /could not read/);
  assert.equal((await readThemeTokens(wrong) as { problem: string }).problem, "wrong shape (version is not 1)");
  assert.deepEqual((await readThemeTokens(fixture) as { tokens: ThemeTokens }).tokens, TOKENS);
  pass("the --theme file is read, or the reason it was not is given");
}

// The agent is told about the file only when it was written; otherwise the prompt is exactly as before.
{
  assert.equal(systemPrompt({ staticSite: true }), staticPrompt(SYSTEM_PROMPT));
  assert.equal(systemPrompt({}), SYSTEM_PROMPT);
  assert.ok(systemPrompt({ staticSite: true, themeTokens: true }).endsWith(THEME_INSTRUCTION));
  assert.match(THEME_INSTRUCTION, /add no colour or font that is not in it/);
  assert.match(THEME_INSTRUCTION, /Change a value only when/);
  const creative = await readFile(path.join(specsDir, "creative.md"), "utf8");
  const look = await readFile(path.join(specsDir, "look.md"), "utf8");
  assert.match(creative, /When `src\/theme\.ts` is already there when you start/);
  assert.match(creative, /add no colour or font that is not in it/);
  assert.match(look, /already exports `tokens` when you start/);
  pass("the agent and the specs say to start from src/theme.ts, and only when it is there");
}
