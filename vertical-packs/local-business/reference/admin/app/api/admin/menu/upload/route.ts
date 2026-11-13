import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminApiGuard } from "../../../../../lib/admin-session";
import { getDb } from "../../../../../lib/db";
import { readXlsx } from "../../../../../lib/xlsx-read";
import { addToMenu, adminMenu, countDishes, replaceMenu } from "../../../../../lib/menu-store";
import { MAX_SHEET_BYTES, menuFromRows, parseCsv } from "../../../../../lib/menu-sheet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * A menu from a spreadsheet (.csv or .xlsx). Two steps, so nothing is replaced by accident:
 *   confirm absent  -> read the file and say what would happen ("preview"). Nothing changes.
 *   confirm = "1"   -> do it. mode "replace" (the default) makes the file the whole menu; mode "add" only adds what is missing.
 */
export async function POST(req: Request) {
  const denied = await adminApiGuard(req, { write: true });
  if (denied) return denied;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a .csv or .xlsx file." }, { status: 400 });
  if (file.size > MAX_SHEET_BYTES) return NextResponse.json({ error: "That file is too big. Keep it under 1 MB." }, { status: 413 });
  const mode = form?.get("mode") === "add" ? "add" : "replace";
  const lower = file.name.toLowerCase();
  let rows: unknown[][];
  try {
    if (/\.(csv|tsv|txt)$/.test(lower)) rows = parseCsv(await file.text());
    else if (lower.endsWith(".xlsx")) rows = readXlsx(new Uint8Array(await file.arrayBuffer()));
    else return NextResponse.json({ error: "Use a .csv or .xlsx file. In Excel or Sheets choose Save as or Download as one of those." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "I could not open that file. Save it again as .csv or .xlsx and try once more." }, { status: 400 });
  }
  const menu = menuFromRows(rows);
  if (!menu.ok) return NextResponse.json({ error: menu.error }, { status: 422 });
  const db = getDb();
  const current = countDishes(await adminMenu(db));
  if (form?.get("confirm") !== "1") {
    return NextResponse.json({ preview: true, mode, dishes: menu.dishes, sections: menu.categories.length, current, skipped: menu.skipped });
  }
  if (mode === "add") {
    const r = await addToMenu(db, menu.categories);
    revalidatePath("/", "layout");
    return NextResponse.json({ done: true, mode, added: r.added, skipped: [...menu.skipped, ...r.skipped] });
  }
  await replaceMenu(db, menu.categories);
  revalidatePath("/", "layout");
  return NextResponse.json({ done: true, mode, dishes: menu.dishes, skipped: menu.skipped });
}
