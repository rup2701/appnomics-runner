import { NextResponse } from "next/server";
import { COOKIE, fingerprint, makeSession, recordFailure, sameOrigin, sessionCookieOptions, tooManyFailures, verifyPassword } from "../../../../lib/auth";
import { dbConfigured, getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const back = (req: Request, to: string) => NextResponse.redirect(new URL(to, req.url), 303);

export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!sameOrigin(req.headers.get("origin"), req.headers.get("host"))) return back(req, "/admin/login?e=origin");
  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") ?? "").trim().toLowerCase();
  const password = String(form?.get("password") ?? "");
  const db = getDb();
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = fingerprint(ip, process.env.SESSION_SECRET || "admin");
  if (await tooManyFailures(db, ipHash)) return back(req, "/admin/login?e=many");
  const okEmail = !!process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase();
  const okPass = verifyPassword(password, process.env.ADMIN_PASSWORD_HASH);
  if (!okEmail || !okPass || !process.env.SESSION_SECRET) {
    await recordFailure(db, ipHash).catch(() => {});
    return back(req, "/admin/login?e=bad");
  }
  const res = back(req, "/admin/menu");
  res.cookies.set(COOKIE, makeSession(email, process.env.SESSION_SECRET), sessionCookieOptions);
  return res;
}
