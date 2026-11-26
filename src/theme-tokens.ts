// PR B: the design tokens of the Visual design tile the owner saw in the Builder, written into the site as src/theme.ts
// before the agent starts, so the build starts from that look. The Builder's worker passes them with --theme (a JSON file).
// The shape check is the same as the Builder's src/lib/builder/theme-tokens.ts; the two must accept the same things.
// Anything wrong means no src/theme.ts and a build exactly as without --theme.
import { readFile } from "node:fs/promises";

const HEX = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;
/** Font and choice names go into a TypeScript file, so only plain names pass. */
const NAME = /^[A-Za-z0-9 -]{1,40}$/;

const COLOR_KEYS = [
  "background", "surface", "border", "text", "muted", "inverse", "onInverse", "accent", "onAccent", "accentText",
  "tint50", "tint100", "tint200", "tint300", "tint700", "tint900", "glow", "dot", "edge", "shadow",
] as const;
const WEIGHT_KEYS = ["headline", "strong", "title", "medium", "body", "numeral"] as const;
const TYPE_KEYS = [
  "hero", "heroTracking", "heroLine", "section", "sectionTracking", "sectionLine", "body", "bodyLine",
  "small", "label", "eyebrow", "eyebrowTracking", "capsTracking", "caption", "cardTitle", "price", "numeral",
] as const;
const SPACE_KEYS = ["section", "gutter", "cardPad", "gap", "contentMax", "headingGap", "heroGap", "buttonHeight"] as const;
const RADIUS_KEYS = ["card", "closing", "small", "round"] as const;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isPair = (v: unknown) => Array.isArray(v) && v.length === 2 && v.every(isNum);
const numOrPair = (v: unknown) => isNum(v) || isPair(v);

/** The parts of the tokens this file reads. The rest is copied into src/theme.ts as it is. */
export type ThemeTokens = {
  version: 1;
  direction: { pairing: string; motif: string; heroKind: string; heroLayout: "centred" | "split"; signatures: string[] };
  font: { heading: string; body: string; accent: string | null; capsLabels: boolean; weight: { headline: number } };
} & Obj;

/** Null when the tokens have the shape a build can use; otherwise what is wrong, in a few words. */
export function themeTokensProblem(x: unknown): string | null {
  if (!isObj(x)) return "not an object";
  if (x.version !== 1) return "version is not 1";
  if (x.mode !== "light" && x.mode !== "dark") return "mode is not light or dark";
  if (!["calm", "bold", "playful", "serious"].includes(x.tone as string)) return "tone is not one of the four";
  if (!(x.neutralHue === null || isNum(x.neutralHue))) return "neutralHue";
  if (!(x.accentGiven === null || (typeof x.accentGiven === "string" && HEX.test(x.accentGiven)))) return "accentGiven";

  const d = x.direction;
  if (!isObj(d)) return "direction is missing";
  for (const k of ["pairing", "motif", "heroKind"]) if (typeof d[k] !== "string" || !NAME.test(d[k] as string)) return `direction.${k}`;
  if (d.heroLayout !== "centred" && d.heroLayout !== "split") return "direction.heroLayout";
  if (!Array.isArray(d.signatures) || d.signatures.length > 3 || !d.signatures.every((s) => typeof s === "string" && NAME.test(s))) return "direction.signatures";

  const c = x.color;
  if (!isObj(c)) return "color is missing";
  for (const k of COLOR_KEYS) if (typeof c[k] !== "string" || !HEX.test(c[k] as string)) return `color.${k}`;

  const f = x.font;
  if (!isObj(f)) return "font is missing";
  for (const k of ["heading", "body"]) if (typeof f[k] !== "string" || !NAME.test(f[k] as string)) return `font.${k}`;
  if (!(f.accent === null || (typeof f.accent === "string" && NAME.test(f.accent)))) return "font.accent";
  if (typeof f.capsLabels !== "boolean") return "font.capsLabels";
  if (!isObj(f.weight)) return "font.weight is missing";
  for (const k of WEIGHT_KEYS) {
    const w = f.weight[k];
    if (!isNum(w) || w < 100 || w > 900) return `font.weight.${k}`;
  }

  const groups: [string, readonly string[]][] = [["type", TYPE_KEYS], ["space", SPACE_KEYS], ["radius", RADIUS_KEYS]];
  for (const [name, keys] of groups) {
    const g = x[name];
    if (!isObj(g)) return `${name} is missing`;
    for (const k of keys) if (!numOrPair(g[k])) return `${name}.${k}`;
  }

  const dp = x.depth;
  if (!isObj(dp)) return "depth is missing";
  if (!isNum(dp.dotGrid) || !isNum(dp.dotSize) || !isPair(dp.glowAt) || !isPair(dp.glowSize)) return "depth";
  if (dp.cardEdge !== "blended" && dp.cardEdge !== "defined") return "depth.cardEdge";
  return null;
}

/** Reads the --theme file. Never throws: a missing, unreadable or wrong file gives the reason instead. */
export async function readThemeTokens(file: string): Promise<{ tokens: ThemeTokens } | { problem: string }> {
  let x: unknown;
  try {
    x = JSON.parse(await readFile(file, "utf8"));
  } catch (e) {
    return { problem: `could not read ${file} (${e instanceof Error ? e.message.slice(0, 120) : String(e)})` };
  }
  const problem = themeTokensProblem(x);
  return problem ? { problem: `wrong shape (${problem})` } : { tokens: x as ThemeTokens };
}

/** The direction object of specs/creative.md, filled in from the tokens, in the same shape and order. */
export function directionFrom(t: ThemeTokens) {
  return {
    pairing: t.direction.pairing,
    headingFont: t.font.heading,
    bodyFont: t.font.body,
    accentFont: t.font.accent,
    headingWeight: t.font.weight.headline,
    capsLabels: t.font.capsLabels,
    motif: t.direction.motif,
    heroKind: t.direction.heroKind,
    heroLayout: t.direction.heroLayout,
    signatures: t.direction.signatures,
  };
}

/** The site's src/theme.ts: the tokens as they are, and the direction filled in from them. */
export function themeFile(t: ThemeTokens): string {
  return `/**
 * The site's theme.
 *
 * tokens: the colours, fonts, weights, type sizes, spacing, radii and depth of the Visual design the owner saw in the
 * Builder, worked out by code from their mode, accent and tone and the design brief. Start from them: import every colour,
 * font, weight, size, spacing and radius from here, and add no colour or font that is not in them. Change a value only when
 * a look.md or creative.md check fails with it or the owner asks for something else, and record the old value, the new one
 * and the reason in AGENT_LOG.md. Sizes are in px as [desktop, phone]; letter spacing is in em.
 *
 * direction: the choices from specs/creative.md, filled in from the same tokens. Keep it in this shape.
 */
export const tokens = ${JSON.stringify(t, null, 2)} as const;

export const direction = ${JSON.stringify(directionFrom(t), null, 2)} as const;
`;
}

/** Added to the agent's instructions only when src/theme.ts was written from the tokens. */
export const THEME_INSTRUCTION = `- src/theme.ts is already there. It holds the tokens of the Visual design the owner saw (colours, fonts, weights, type sizes, spacing, radii, depth) and the direction filled in from them (see specs/creative.md). Start from it: keep both exports, import the page's colours, fonts, weights, sizes, spacing and radii from it (for example as CSS variables), and add no colour or font that is not in it. Change a value only when a look.md or creative.md check fails with it or the owner asked for something else, and record the old value, the new one and the reason in AGENT_LOG.md under Decisions on ambiguous points.`;
