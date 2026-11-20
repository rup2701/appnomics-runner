// The product showcase pack's look and direction rules (APP-39), and the look pass that every pack with a look.md runs.
import assert from "node:assert/strict";
import { mkdtemp, readFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createWorkspace } from "../src/workspace.js";

const root = path.resolve(import.meta.dirname, "..");
const packs = path.join(root, "vertical-packs");
const read = (...p: string[]) => readFile(path.join(...p), "utf8");
const exists = (f: string) => access(f).then(() => true, () => false);
const pass = (name: string) => console.log(`PASS ${name}`);

const look = await read(packs, "product-showcase/specs/look.md");
const creative = await read(packs, "product-showcase/specs/creative.md");
const interview = await read(packs, "product-showcase/interview.md");
const brief = JSON.parse(await read(packs, "product-showcase/brief.example.json"));
const cli = await read(root, "src/cli.ts");
const agent = await read(root, "src/agent.ts");

// Each pack with look rules gets its own look.md in the run, and only the showcase gets creative.md.
{
  const dir = await mkdtemp(path.join(os.tmpdir(), "runner-packs-"));
  for (const pack of ["site", "product-showcase", "local-business"]) {
    const specsDir = path.join(packs, pack, "specs");
    const ws = await createWorkspace({ prompt: `look ${pack}`, specsDir, brief: { site: { name: "Test" } }, runsDir: path.join(dir, pack), skipDb: true });
    assert.equal(await read(ws.appDir, "specs/look.md"), await read(specsDir, "look.md"), `${pack} run has its own look.md`);
    assert.equal(await exists(path.join(ws.appDir, "specs/creative.md")), pack === "product-showcase", `${pack} creative.md`);
  }
  pass("each pack's run gets its own look.md, and only the showcase gets creative.md");
}

// The look pass and change instructions point at the pack's own files and carry no rules from one pack.
{
  const lookPass = cli.slice(cli.indexOf("const LOOK_PASS_MESSAGE"), cli.indexOf("const changeMessage"));
  assert.match(lookPass, /this pack's own specs\/look\.md/);
  assert.match(lookPass, /specs\/creative\.md/);
  assert.match(lookPass, /src\/theme\.ts/);
  assert.doesNotMatch(lookPass, /lucide-react|full screen|window frame|card-count table/, "no waitlist-only rules in the look pass");
  assert.match(lookPass, /never spells out text the owner can edit/);
  assert.match(cli, /specs\/creative\.md, if it exists\) only when the change is about look/);
  assert.match(agent, /then specs\/creative\.md if it exists/);
  pass("look pass and change instructions name each pack's own look.md and the direction file");
}

// The direction layer: pairings with their headline weight, the Outfit pairing, the Stack motif, the hero kinds.
{
  const rows = creative.split("\n").filter((l) => /^\| [A-Z]/.test(l) && !l.startsWith("| Pairing") && !l.startsWith("| Motif") && !l.startsWith("| The owner"));
  const pairings = rows.filter((l) => l.split("|").length === 8);
  assert.equal(pairings.length, 7, "seven pairings");
  for (const p of pairings) {
    const weight = p.split("|")[3].trim();
    assert.ok(/^(600|700|800)$/.test(weight) || weight.startsWith("the tone's display weight"), `pairing declares a headline weight: ${p}`);
  }
  assert.ok(pairings.some((p) => /\| Heavy geometric \| Outfit \| 800 \| Inter \|/.test(p)), "Heavy geometric is Outfit 800 with Inter");
  assert.match(creative, /Heavy geometric uses uppercase nav and labels/);
  assert.match(creative, /letter spacing of at least 0\.08em/);
  assert.match(creative, /\*\*Only headlines go above 700\.\*\*/);
  const motifs = rows.filter((l) => l.split("|").length === 5);
  assert.equal(motifs.length, 8, "eight motifs");
  assert.ok(motifs.some((m) => m.startsWith("| Stack |")), "Stack motif");
  for (const k of ["frame", "fragment", "owner-art"]) assert.match(creative, new RegExp(`\\*\\*${k}\\*\\*`));
  assert.match(creative, /export const direction = \{/);
  assert.match(creative, /headingWeight/);
  assert.match(creative, /equals `direction\.headingWeight`/, "a check compares the headline weight with the pairing");
  pass("creative.md has seven pairings with headline weights, Outfit 800 with caps labels, the Stack motif and the hero kinds");
}

// The hero shows a concept preview, never a blank box, and invents no figures.
{
  assert.doesNotMatch(look, /No mock-up is drawn/);
  assert.doesNotMatch(look, /Inter only/);
  for (const f of ["requirements.json", "edges.json", "experience.json"]) {
    assert.doesNotMatch(await read(packs, "product-showcase/specs", f), /No mock-up is drawn|plain labelled placeholder box/, f);
  }
  assert.doesNotMatch(JSON.stringify(brief), /No mock-up is drawn/);
  const hero = look.slice(look.indexOf("## Hero"), look.indexOf("## Benefits grid"));
  assert.match(hero, /"Concept preview" label/);
  assert.match(hero, /marked "Sample"/);
  assert.match(hero, /No invented figures/);
  assert.match(hero, /never an empty box/);
  assert.match(look, /Nothing but a headline is heavier than 700/);
  pass("the hero is a frame or fragment labelled Concept preview, with filler marked Sample and no invented figures");
}

// No blue by default. The colour list stays for owners who want to choose, and dark stays a colour choice.
{
  assert.doesNotMatch(interview, /Calm and light, shown on the review as a default/);
  assert.match(interview, /Light is not the default and blue is not the default/);
  assert.match(interview, /blue \(#2563EB\), green \(#00B377\)/, "the colour list is kept");
  assert.doesNotMatch(look, /calm: a blue or teal/);
  assert.match(look, /never blue by default/);
  assert.notEqual(brief.look.accent.toUpperCase(), "#2563EB");
  assert.deepEqual(brief.brand.tone_options, ["calm", "bold", "playful", "serious"], "no new tone value");
  assert.ok(brief.brand.color_options.includes("dark"));
  pass("no blue default; the colour list and the dark colour choice are kept, with no new tone");
}

// One split section at most, instead of the old alternating rule.
{
  assert.doesNotMatch(look, /Alternate layouts down the page/);
  assert.match(look, /At most one section on the page may be a split/);
  assert.match(look, /30\. Page shape: at 1440, at most one section has two side-by-side columns/);
  pass("the alternating rule is replaced by one allowed split section, with a check");
}

// APP-41: no check spells out copy the owner can edit. Take that copy from the example brief.
{
  const copy = new Set<string>();
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === "object") {
      for (const [k, v] of Object.entries(o)) {
        if (typeof v === "string" && ["headline", "subheadline", "label", "name", "question", "answer", "title", "text", "line"].includes(k) && v.length >= 6) copy.add(v);
        else walk(v);
      }
    }
  };
  walk(brief.blocks ?? brief);
  // Labels the pack itself fixes, not the owner's copy: the preview and sample labels, and the footer columns and legal links
  // that look.md section 7 and check 15 require. (Whether owners may rename those is APP-41's question.)
  ["Concept preview", "Sample", "Product", "Company", "Resources", "Privacy", "Terms", "Security"].forEach((s) => copy.delete(s));
  assert.ok(copy.size > 10, "found the example's copy");
  const checks = look.slice(look.indexOf("## Checks to run before you finish")) + creative.slice(creative.indexOf("## 7. Checks"));
  for (const c of copy) assert.ok(!checks.includes(c), `a check spells out owner copy: ${c}`);
  assert.match(look, /32\. No check spells out text the owner can edit/);
  pass("no check spells out the owner's copy, and the rule is written down");
}

// direction.json is the closed lists of creative.md, for code that checks a choice (the Builder's design brief, APP-42). The two never differ.
{
  const dir = JSON.parse(await read(packs, "product-showcase/direction.json")) as {
    pairings: { name: string; heading: string; headingWeight: number | "tone"; body: string; accentFont: string | null; capsLabels: boolean; fits: string }[];
    motifs: { name: string; looks: string; goodFor: string }[]; heroKinds: { name: string; what: string }[]; signatures: { name: string; what: string }[];
    heroLayouts: { name: string; what: string; heroKinds: string[] }[];
  };
  const rows = creative.split("\n").filter((l) => /^\| [A-Z]/.test(l) && !l.startsWith("| Pairing") && !l.startsWith("| Motif") && !l.startsWith("| The owner"));
  const cells = (l: string) => l.split("|").slice(1, -1).map((c) => c.trim());
  const pairings = rows.filter((l) => l.split("|").length === 8).map(cells);
  assert.deepEqual(dir.pairings.map((p) => p.name), pairings.map((c) => c[0]), "same pairings, same order");
  for (const p of dir.pairings) {
    const c = pairings.find((x) => x[0] === p.name)!;
    assert.equal(p.heading, c[1], `${p.name} heading font`);
    assert.equal(String(p.headingWeight), /^\d+$/.test(c[2]) ? c[2] : "tone", `${p.name} headline weight`);
    assert.equal(p.body, c[3], `${p.name} body font`);
    assert.equal(p.accentFont ?? "none", c[4], `${p.name} accent font`);
    assert.equal(p.capsLabels, p.name === "Heavy geometric", `${p.name} caps labels`);
    assert.equal(p.fits, c[5], `${p.name} fits`);
  }
  assert.deepEqual(dir.motifs.map((m) => [m.name, m.looks, m.goodFor]), rows.filter((l) => l.split("|").length === 5).map((l) => cells(l)), "same motifs");
  for (const k of dir.heroKinds) assert.match(creative, new RegExp(`\\*\\*${k.name}\\*\\*`), `hero kind ${k.name}`);
  assert.equal(dir.heroKinds.length, 3);
  const sigs = [...creative.matchAll(/^- `([a-z-]+)`: (.+)$/gm)].map((m) => [m[1], m[2]]);
  assert.deepEqual(dir.signatures.map((s) => [s.name, s.what]), sigs, "same signature names");
  const layouts = [...creative.matchAll(/^\d\. \*\*(centred|split)\*\*: (.+)$/gm)].map((m) => [m[1], m[2]]);
  assert.deepEqual(dir.heroLayouts.map((l) => l.name), layouts.map((l) => l[0]), "same hero layouts, same order");
  for (const l of dir.heroLayouts) {
    const text = layouts.find((x) => x[0] === l.name)![1];
    assert.ok(text.startsWith(`${l.what}.`), `hero layout ${l.name} has the same description`);
    assert.ok(l.heroKinds.every((k) => dir.heroKinds.some((h) => h.name === k)), `hero layout ${l.name} names known hero kinds`);
    if (l.heroKinds.length === dir.heroKinds.length) assert.match(text, /Any hero kind\./, `${l.name} is for any hero kind`);
    else assert.match(text, new RegExp(`Only when \`heroKind\` is ${l.heroKinds.map((k) => `\`${k}\``).join(" or ")}\\.`), `${l.name} names its hero kinds`);
  }
  assert.deepEqual(dir.heroLayouts.find((l) => l.name === "split")!.heroKinds, ["fragment"], "split only with a fragment");
  pass("direction.json matches the pairing, motif, hero kind, hero layout and signature lists in creative.md");
}

// APP-42 decisions of 18 November: where the style tile and the pack disagreed, the tile wins. Preview scale (body size, headline size, dot spacing) is left alone.
{
  // 1. Dark is a navy ink from the accent, not a fixed near-black green, and the owner's own background wins.
  assert.doesNotMatch(look, /#0B0F0D \|\n/, "no near-black green dark background");
  assert.doesNotMatch(look, /#151B18|#232B27|#A9B4AE/, "no green dark neutrals");
  const dark = look.slice(look.indexOf("### Dark mode: navy ink"), look.indexOf("If neither"));
  const roles = [...dark.matchAll(/^\| (background|surface|border|text|muted text) \| ([\d.]+) \| ([\d.]+) \|$/gm)].map((m) => ({ role: m[1], l: Number(m[2]), c: Number(m[3]) }));
  assert.equal(roles.length, 5, "five navy ink roles");
  const hexes = dark.match(/the roles are (#[0-9A-F]{6}), (#[0-9A-F]{6}), (#[0-9A-F]{6}), (#[0-9A-F]{6}) and (#[0-9A-F]{6})/)!.slice(1);
  const toHex = (L: number, C: number, h: number) => {
    const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
    return lin.map((v) => Math.round(255 * Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055))));
  };
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  roles.forEach((r, i) => toHex(r.l, r.c, 268).forEach((v, k) => assert.ok(Math.abs(v - rgb(hexes[i])[k]) <= 3, `${r.role}: lightness and chroma at hue 268 give ${hexes[i]}`)));
  assert.deepEqual(rgb(hexes[0]), rgb("#0B1020"), "the orange example is the tile's navy");
  const hue = (accent: number) => {
    const d = ((accent - 268 + 540) % 360) - 180;
    return Math.abs(d) >= 50 ? 268 : (accent - Math.sign(d || -1) * 50 + 360) % 360;
  };
  for (const [accent, base] of [...dark.matchAll(/an accent at hue (\d+) gives a shared hue of (\d+)|an accent at (\d+) gives (\d+)/g)].map((m) => [Number(m[1] ?? m[3]), Number(m[2] ?? m[4])])) assert.equal(hue(accent), base, `accent ${accent}`);
  assert.equal(hue(48), 268, "orange keeps navy");
  assert.match(look, /`look\.background`: one hex colour \(optional\)/);
  assert.match(dark, /\*\*The owner's own background wins\.\*\*/);
  assert.match(dark, /never change the owner's colour/);
  // 2. A split hero, only with a fragment.
  const hero = look.slice(look.indexOf("## Hero"), look.indexOf("## Benefits grid"));
  assert.match(hero, /\*\*Split\*\* \(only when the hero kind is `fragment`\)/);
  assert.match(hero, /A frame or an owner image always uses the centred layout/);
  assert.match(creative, /heroLayout: "split", +\/\/ centred, or split \(only with a fragment\)/);
  assert.match(look, /A split hero does not count: the hero is not a section/);
  // 3. Glow and card radius as in the tile.
  assert.doesNotMatch(look, /top-centre glow|centred at the top of the first screen/);
  assert.match(look, /about 60% wide and 40% tall, centred at 18% across and 8% down the first screen/);
  assert.match(look, /\| Card radius \| 16 px \| 16 px \| 32 px \| 8 px \|/, "bold cards at 16 px");
  assert.match(look, /a radius 1\.25 times the card radius/);
  // 4. Only headlines above 700, oversized numerals as the signature up to 800, logo, matchup, step titles and prices at 700.
  for (const f of [look, creative]) {
    assert.match(f, /The logo, the titles inside the hero's fragment \(.*matchup.*\), step titles and prices use 700/);
    assert.match(f, /may use the headline weight, up to 800/);
    assert.match(f, /data-signature="oversized-numerals"/);
  }
  // 5. The motif goes beyond the hero, and "less busy" no longer strips it to the hero.
  assert.match(look, /\*\*The motif goes beyond the hero\.\*\*/);
  assert.doesNotMatch(creative, /remove the motif from every section except the hero/);
  // 6. Equal plans, equal treatment.
  assert.match(look, /\*\*Equal plans get equal treatment\.\*\* A plan is highlighted only when the owner asked for it/);
  // The checks are numbered without gaps, and each decision has one.
  const checks = look.slice(look.indexOf("## Checks to run before you finish"));
  const nums = [...checks.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]));
  assert.deepEqual(nums, nums.map((_, i) => i + 1), "checks numbered 1 to n");
  for (const c of [/22\. Glow .* 18% across and 8% down/, /27\. Weights: .*data-signature="oversized-numerals"/, /33\. Hero layout: /, /34\. Dark base: /, /35\. Card radius: /, /36\. Plans: with no plan marked `highlight: true`/, /37\. Motif: /]) assert.match(checks, c);
  pass("the look rules follow the style tile: navy ink dark base, split fragment hero, glow and radius, weights, motif, equal plans");
}

// Icons for features, numerals for steps (RP, 20 November): every feature grid item has an icon, in any layout; numerals
// are only for steps and the oversized-numerals signature.
{
  const look = await readFile(path.join(packs, "product-showcase", "specs", "look.md"), "utf8");
  const creative = await readFile(path.join(packs, "product-showcase", "specs", "creative.md"), "utf8");
  const req = await readFile(path.join(packs, "product-showcase", "specs", "requirements.json"), "utf8");
  assert.match(look, /\*\*Icons for features, numerals for steps\.\*\* Every item in a grid of features carries one icon: .*in any layout \(bento, columns, a 2x2, an accordion\)/);
  assert.match(look, /Numerals are only for a sequence of steps/);
  assert.match(look, /- \*\*Card contents:\*\* the card's icon at the top/);
  assert.match(look, /use-case cards \(up to four, each with an icon, a title and one line\)/);
  assert.match(look, /16\. Bento: .*every benefit card holds exactly one icon .*no benefit or use-case card holds a numeral/);
  for (const f of [look, creative, req]) {
    assert.doesNotMatch(f, /benefit numeral|benefit cards, steps|a numeral that does not overlap the title|Benefit cards use numerals|No icon squares|no benefit card has an icon square/);
  }
  assert.match(creative, /Benefit and use-case cards carry icons, never numerals, whatever the signatures/);
  assert.match(look, /1\. \*\*How it works:\*\* heading, then up to three columns, each with a numeral/, "steps keep their numerals");
  pass("feature grids carry icons in any layout, and numerals are kept for steps");
  // Four cards with a short first card are a narrower 2x2, never one row (RP, 20 November).
  assert.match(look, /\*\*Four cards with a short first card: a 2x2\.\*\* .*at least 100 characters.*at most 740 px wide and centred.*Four cards are never laid out in one row\./);
  assert.match(look, /16\. Bento: .*except four equal cards in the 2x2 .*four cards are never in one row/);
  assert.match(req, /Four cards with a short first card are a 2x2 of equal cards, at most 740 px wide and centred/);
  pass("four cards with a short first card are a 2x2 at most 740 px wide, never one row");
}

// A design brief written from the interview goes into the run as specs/design-brief.md, and the agent reads it after creative.md (APP-42).
{
  const tmp = await mkdtemp(path.join(os.tmpdir(), "runner-design-brief-"));
  const specsDir = path.join(packs, "product-showcase", "specs");
  const md = "# Design brief\n\nThe owner said: \"bold is fine\"\n";
  const withBrief = await createWorkspace({ prompt: "design brief", specsDir, brief: { site: { name: "Test" } }, runsDir: tmp, skipDb: true, designBrief: md });
  assert.equal(await read(withBrief.appDir, "specs/design-brief.md"), md);
  const without = await createWorkspace({ prompt: "no design brief", specsDir, brief: { site: { name: "Test" } }, runsDir: tmp, skipDb: true });
  assert.equal(await exists(path.join(without.appDir, "specs/design-brief.md")), false, "no file when there is no design brief");
  assert.equal(await exists(path.join(specsDir, "design-brief.md")), false, "the pack itself has no design brief");
  assert.match(agent, /then specs\/creative\.md if it exists \(.*\), then specs\/design-brief\.md if it exists \(read it right after creative\.md/);
  assert.match(agent, /Its gaps are open questions: never answer or fill them on the page/);
  assert.match(agent, /Never put its quotes, notes or questions on the page as content/);
  const lookPass = cli.slice(cli.indexOf("const LOOK_PASS_MESSAGE"), cli.indexOf("const changeMessage"));
  assert.match(lookPass, /specs\/design-brief\.md if it exists/);
  assert.match(cli, /arg\("design-brief"\)/);
  pass("the design brief goes into the run after creative.md, and the agent is told how to use it");
}

console.log("showcase pack tests passed");
