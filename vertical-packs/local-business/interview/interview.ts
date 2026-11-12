// The interview for a local business brief (restaurant first). Pure functions, no model calls: code chooses the next question and checks
// every answer, the model only puts the question in its own words. Nothing is written to the brief except through applyAnswer.
import questions from "./questions.json" with { type: "json" };

export type Brief = Record<string, any>;
export type State = { asked: string[]; skipped: string[] };
type Cond = { path: string; op: "empty" | "filled" | "true" | "notTrue" };
export type Question = { id: string; priority: number; when: Cond[]; ask: string; why: string; options: string[]; apply: string; clears?: string };
export type Result = { ok: true; brief: Brief } | { ok: false; error: string };

export const QUESTIONS = questions.questions as Question[];

const at = (b: Brief, path: string): any => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), b);
const isEmpty = (v: unknown) => v == null || v === "" || (Array.isArray(v) && v.length === 0);

function holds(b: Brief, c: Cond): boolean {
  const v = at(b, c.path);
  if (c.op === "empty") return isEmpty(v);
  if (c.op === "filled") return !isEmpty(v);
  if (c.op === "true") return v === true;
  return v !== true;
}

/** The questions worth asking now, best first. A question already asked or skipped is never returned again. */
export function nextQuestions(brief: Brief, state: State = { asked: [], skipped: [] }, max = 1): Question[] {
  const done = new Set([...state.asked, ...state.skipped]);
  return QUESTIONS.filter((q) => !done.has(q.id) && q.when.every((c) => holds(brief, c)))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, max);
}

/** The question text with the restaurant's own details filled in. Only facts from the brief are used. */
export function renderAsk(q: Question, brief: Brief): string {
  const dishes = (brief.menu?.categories ?? []).flatMap((c: any) => c.items.map((i: any) => i.name as string)).slice(0, 3);
  return q.ask.replace("{name}", brief.site?.name ?? "your restaurant").replace("{dishes}", dishes.length ? dishes.join(", ") : "your best sellers");
}

const https = (u: unknown): string | null => (typeof u === "string" && /^https:\/\/\S+$/i.test(u.trim()) && u.trim().length < 500 ? u.trim() : null);
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const fail = (error: string): Result => ({ ok: false, error });

type Handler = (b: Brief, answer: any) => Result | void;

const HANDLERS: Record<string, Handler> = {
  confirmOwner(b, a) {
    if (b.private_test === true) return fail("A private test cannot be confirmed here. Clearing private_test is a separate, deliberate step.");
    const who = typeof a?.confirmedBy === "string" ? a.confirmedBy.trim() : "";
    if (a?.owner !== true || !who) return fail("Say who confirmed, and that they are the owner.");
    b.images = { ...(b.images ?? {}), owner_confirmed: true, confirmed_by: who };
    b.consent = { owner_confirmed: true, by: who };
  },
  story(b, a) {
    const body = typeof a?.text === "string" ? a.text.trim() : "";
    if (body.length < 40) return fail("The story is too short to be a page. Ask for a few sentences.");
    b.story = { heading: typeof a?.heading === "string" && a.heading.trim() ? a.heading.trim() : "Our story", body };
  },
  reviews(b, a) {
    const list = Array.isArray(a?.reviews) ? a.reviews : [];
    const clean = list.map((r: any) => ({ quote: typeof r?.quote === "string" ? r.quote.trim() : "", author: typeof r?.author === "string" ? r.author.trim() : "", rating: r?.rating })).filter((r: any) => r.quote);
    if (!clean.length) return fail("No review text was given.");
    const seen = new Set<string>((b.testimonials ?? []).map((t: any) => norm(t.quote)));
    const add = [] as any[];
    for (const r of clean) {
      if (seen.has(norm(r.quote))) continue;
      seen.add(norm(r.quote));
      add.push({ quote: r.quote, ...(r.author ? { author: r.author } : {}), ...(Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5 ? { rating: r.rating } : {}) });
    }
    b.testimonials = [...(b.testimonials ?? []), ...add];
  },
  highlights(b, a) {
    const names: string[] = Array.isArray(a?.dishes) ? a.dishes.filter((n: unknown) => typeof n === "string") : [];
    const known = new Map<string, string>((b.menu?.categories ?? []).flatMap((c: any) => c.items.map((i: any) => [norm(i.name), i.name as string])));
    const unknown = names.filter((n) => !known.has(norm(n)));
    if (unknown.length) return fail(`These are not on the menu: ${unknown.join(", ")}. Use the dish names exactly as the menu has them.`);
    if (names.length < 3 || names.length > 6) return fail("Pick between three and six dishes.");
    b.menu = { ...b.menu, highlights: names.map((n) => known.get(norm(n)) as string) };
  },
  bookingLink(b, a) {
    const url = https(a?.url);
    if (!url) return fail("The booking link must start with https://");
    b.links = { ...(b.links ?? {}), reserve: url };
  },
  email(b, a) {
    const e = typeof a?.email === "string" ? a.email.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 200) return fail("That does not look like an email address.");
    b.contact = { ...(b.contact ?? {}), email: e };
  },
  socials(b, a) {
    const list = (Array.isArray(a?.links) ? a.links : []).map((l: any) => ({ label: typeof l?.label === "string" ? l.label.trim() : "", url: https(l?.url) })).filter((l: any) => l.label && l.url);
    if (!list.length) return fail("Give each link a name (like Instagram) and an https address.");
    b.socials = list;
  },
  hours(b, a) {
    const lines = (Array.isArray(a?.lines) ? a.lines : []).filter((l: unknown) => typeof l === "string").map((l: string) => l.trim()).filter(Boolean);
    if (!lines.length) return fail("No opening hours were given.");
    b.contact = { ...(b.contact ?? {}), hours: lines };
  },
  showPrices(b, a) {
    if (typeof a?.show !== "boolean") return fail("Say whether to show prices.");
    b.menu = { ...b.menu, show_prices: a.show };
  },
};

/** Check an answer and write it into a copy of the brief. A wrong answer returns an error and changes nothing. */
export function applyAnswer(brief: Brief, id: string, answer: unknown): Result {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) return fail(`No question called ${id}.`);
  const next = structuredClone(brief);
  const res = HANDLERS[q.apply](next, answer);
  if (res && !res.ok) return res;
  if (q.clears && Array.isArray(next.not_found)) next.not_found = next.not_found.filter((n: string) => n !== q.clears);
  return { ok: true, brief: next };
}
