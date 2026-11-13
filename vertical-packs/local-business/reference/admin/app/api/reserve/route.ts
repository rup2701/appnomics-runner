import { NextResponse } from "next/server";
import { getDb, dbConfigured } from "../../../lib/db";
import { handleReservation } from "../../../lib/reserve";
import { sendEmail } from "../../../lib/mail";
import { baked } from "../../../lib/baked";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The booking form posts here once the site has its own database. The Builder's address is only for sites without one. */
export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const input = await req.json().catch(() => null);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  try {
    const r = await handleReservation(getDb(), input, {
      ip,
      salt: process.env.SESSION_SECRET || "reserve",
      siteName: baked.name,
      ownerEmail: process.env.ADMIN_EMAIL,
      now: new Date(),
      mail: (to, msg) => sendEmail(to, msg),
    });
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) {
    console.error("table request failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "We could not send that. Please try again, or call us." }, { status: 500 });
  }
}
