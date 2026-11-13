import { NextResponse } from "next/server";
import { COOKIE, sameOrigin } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req.headers.get("origin"), req.headers.get("host"))) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const res = NextResponse.redirect(new URL("/admin/login", req.url), 303);
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
