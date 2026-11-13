import { createHash } from "node:crypto";
import type { Db } from "./db-types";

/**
 * Table requests, saved in this site's own database. A request is saved first and emailed second, so a failed email never loses one.
 * It is a request, not a booking: nothing here checks availability, and the guest is told the restaurant will confirm.
 */
export const PER_SITE_PER_HOUR = 30;
export const PER_VISITOR_PER_HOUR = 5;
export const MAX_DAYS_AHEAD = 180;

const clean = (s: unknown) => String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();

export type Request = { name: string; phone: string; email: string; day: string; time: string; party: number; note: string };

/** The first problem in the guest's words, or the cleaned request. `today` is the date as yyyy-mm-dd. */
export function checkRequest(input: unknown, today: string): { ok: true; value: Request } | { ok: false; error: string } {
  const i = (input ?? {}) as Record<string, unknown>;
  const name = clean(i.name);
  const phone = clean(i.phone);
  const email = clean(i.email);
  const note = clean(i.note);
  const day = String(i.day ?? "");
  const time = String(i.time ?? "");
  const party = Number(i.party);
  if (!name) return { ok: false, error: "Please tell us your name." };
  if (name.length > 80 || phone.length > 30 || email.length > 120 || note.length > 300) return { ok: false, error: "Something you typed is too long." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false, error: "Please choose a date." };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { ok: false, error: "Please choose a time." };
  if (!Number.isInteger(party) || party < 1) return { ok: false, error: "Please say how many of you." };
  if (party > 20) return { ok: false, error: "For a group of more than 20, please call us." };
  const digits = phone.replace(/\D/g, "");
  const phoneOk = digits.length >= 7 && digits.length <= 15;
  const emailOk = /^\S+@\S+\.\S+$/.test(email);
  if (!phoneOk && !emailOk) return { ok: false, error: "Please give a phone number or an email so the restaurant can confirm." };
  if (email && !emailOk) return { ok: false, error: "That email does not look right." };
  const d = Date.parse(`${day}T00:00:00Z`);
  const t0 = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(d) || new Date(d).toISOString().slice(0, 10) !== day) return { ok: false, error: "Please choose a date." };
  // The server's date is UTC and the restaurant's is not: one day of slack.
  if (d < t0 - 86_400_000) return { ok: false, error: "Please choose today or a later date." };
  if (d > t0 + MAX_DAYS_AHEAD * 86_400_000) return { ok: false, error: "Please choose a date within the next six months." };
  return { ok: true, value: { name, phone, email, day, time, party, note } };
}

export const hashVisitor = (ip: string, salt: string) => createHash("sha256").update(`${salt}|${ip}`).digest("hex").slice(0, 32);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function requestEmail(siteName: string, v: Request) {
  const when = `${v.day} at ${v.time}`;
  const contact = [v.phone ? `Phone: ${v.phone}` : "", v.email ? `Email: ${v.email}` : ""].filter(Boolean);
  const lines = [`${v.name} asked for a table for ${v.party} on ${when}.`, ...contact, ...(v.note ? [`Note: ${v.note}`] : []), "This is a request, not a booking. Please confirm with the guest by phone or email."];
  return {
    subject: `Table request for ${siteName}: ${v.party} on ${when}`,
    text: `${lines.join("\n")}\n`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a"><h1 style="font-size:20px;margin:0 0 16px">${esc(`Table request for ${siteName}`)}</h1>${lines.map((l) => `<p style="margin:0 0 10px;line-height:1.5">${esc(l)}</p>`).join("")}</div>`,
  };
}

export type ReserveCtx = { ip: string; salt: string; siteName: string; ownerEmail?: string; now: Date; mail: (to: string, msg: ReturnType<typeof requestEmail>) => Promise<boolean> };
export type Reply = { status: number; body: { ok?: true; error?: string } };

export async function handleReservation(db: Db, input: unknown, c: ReserveCtx): Promise<Reply> {
  // A filled hidden box is a bot: it gets the same thank-you as a guest and nothing is saved or sent.
  if (typeof (input as { website?: unknown } | null)?.website === "string" && (input as { website: string }).website.trim()) return { status: 200, body: { ok: true } };
  const checked = checkRequest(input, c.now.toISOString().slice(0, 10));
  if (!checked.ok) return { status: 422, body: { error: checked.error } };
  const ipHash = hashVisitor(c.ip, c.salt);
  const since = new Date(c.now.getTime() - 3_600_000);
  const [n] = await db.q("select count(*)::int as site, count(*) filter (where ip_hash = $1)::int as visitor from table_requests where created_at > $2", [ipHash, since]);
  if (Number(n?.visitor ?? 0) >= PER_VISITOR_PER_HOUR || Number(n?.site ?? 0) >= PER_SITE_PER_HOUR) return { status: 429, body: { error: "Too many requests just now. Please call the restaurant instead." } };
  const v = checked.value;
  const [row] = await db.q(
    "insert into table_requests (guest_name, phone, email, day, time, party_size, note, ip_hash) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id",
    [v.name, v.phone || null, v.email || null, v.day, v.time, v.party, v.note || null, ipHash],
  );
  if (c.ownerEmail) {
    const sent = await c.mail(c.ownerEmail, requestEmail(c.siteName, v)).catch(() => false);
    if (sent) await db.q("update table_requests set emailed = true where id = $1", [row.id]).catch(() => {});
  }
  return { status: 200, body: { ok: true } };
}
