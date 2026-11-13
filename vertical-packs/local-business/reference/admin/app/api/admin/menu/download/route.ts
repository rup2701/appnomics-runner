import { adminApiGuard } from "../../../../../lib/admin-session";
import { getDb } from "../../../../../lib/db";
import { adminMenu, menuCsv } from "../../../../../lib/menu-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The current menu as a .csv, in the same columns the upload reads, so it can be edited and sent back. */
export async function GET(req: Request) {
  const denied = await adminApiGuard(req, { write: false });
  if (denied) return denied;
  return new Response(menuCsv(await adminMenu(getDb())), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="menu.csv"' } });
}
