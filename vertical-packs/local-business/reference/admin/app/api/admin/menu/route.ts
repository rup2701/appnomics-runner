import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminApiGuard } from "../../../../lib/admin-session";
import { getDb } from "../../../../lib/db";
import { checkMenu, replaceMenu } from "../../../../lib/menu-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Saves the whole menu as the owner edited it. */
export async function PUT(req: Request) {
  const denied = await adminApiGuard(req, { write: true });
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { categories?: unknown } | null;
  const checked = checkMenu(body?.categories);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 422 });
  await replaceMenu(getDb(), checked.categories);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, categories: checked.categories });
}
