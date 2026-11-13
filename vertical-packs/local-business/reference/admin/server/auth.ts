import { createHash, createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import type { Db } from "./db-types";

/**
 * The owner sign-in: one owner, ADMIN_EMAIL and ADMIN_PASSWORD_HASH (scrypt:<salt>:<hash>), a signed cookie, SESSION_SECRET.
 * The same names the other packs use, so the deploy script sets them without anything new.
 */
export const COOKIE = "rb_admin";
const DAYS = 7;
const FAIL_LIMIT = 10;
const FAIL_WINDOW_MIN = 15;

const eq = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);

export function verifyPassword(password: string, stored: string | undefined): boolean {
  const m = /^scrypt:([0-9a-f]+):([0-9a-f]+)$/.exec((stored ?? "").trim());
  if (!m) return false;
  try {
    return eq(scryptSync(password, Buffer.from(m[1], "hex"), 64), Buffer.from(m[2], "hex"));
  } catch {
    return false;
  }
}

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("hex");

/** A cookie value that says "this owner, until this time", signed so it cannot be made up. */
export function makeSession(email: string, secret: string, now = Date.now()): string {
  const exp = now + DAYS * 86_400_000;
  const payload = `${Buffer.from(email.toLowerCase()).toString("base64url")}.${exp}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function checkSession(value: string | undefined, email: string | undefined, secret: string | undefined, now = Date.now()): boolean {
  if (!value || !email || !secret) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [who, exp, mac] = parts;
  if (!eq(Buffer.from(sign(`${who}.${exp}`, secret)), Buffer.from(mac))) return false;
  if (Number(exp) < now) return false;
  return Buffer.from(who, "base64url").toString() === email.toLowerCase();
}

export const sessionCookieOptions = { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/", maxAge: DAYS * 86_400 };

/** A one-way fingerprint of the visitor's address. The address itself is never stored. */
export const fingerprint = (ip: string, salt: string) => createHash("sha256").update(`${salt}|${ip}`).digest("hex").slice(0, 32);

export async function tooManyFailures(db: Db, ipHash: string): Promise<boolean> {
  const [r] = await db.q(`select count(*)::int as n from admin_login_failures where ip_hash = $1 and at > now() - interval '${FAIL_WINDOW_MIN} minutes'`, [ipHash]);
  return Number(r?.n ?? 0) >= FAIL_LIMIT;
}
export const recordFailure = (db: Db, ipHash: string) => db.q("insert into admin_login_failures (ip_hash) values ($1)", [ipHash]);

/** A POST is accepted only from the site's own pages. The cookie is already same-site only; this is a second lock. */
export function sameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}
