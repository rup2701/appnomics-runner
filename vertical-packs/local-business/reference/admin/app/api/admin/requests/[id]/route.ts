import { NextResponse } from "next/server";
import { adminApiGuard } from "../../../../../lib/admin-session";
import { getDb } from "../../../../../lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Marks a table request new, confirmed or declined. Confirming here does not contact the guest: the owner does that by phone or email. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await adminApiGuard(req, { write: true });
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["new", "confirmed", "declined"].includes(body?.status ?? "")) return NextResponse.json({ error: "Not allowed." }, { status: 400 });
  const rows = await getDb().q("update table_requests set status = $1 where id = $2 returning id", [body!.status, id]);
  return rows.length ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found." }, { status: 404 });
}
