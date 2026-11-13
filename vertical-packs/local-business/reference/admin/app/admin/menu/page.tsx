import { requireAdmin } from "../../../lib/admin-session";
import { baked } from "../../../lib/baked";
import { getDb } from "../../../lib/db";
import { adminMenu, ensureSeeded } from "../../../lib/menu-store";
import { MenuEditor } from "./MenuEditor";

export const dynamic = "force-dynamic";

export default async function AdminMenu() {
  await requireAdmin();
  const db = getDb();
  await ensureSeeded(db, baked.menu.categories);
  return (
    <>
      <h1>Menu</h1>
      <p className="ad-muted">Change a dish, a price or the order, then press Save. Hidden dishes stay here and are left off the website.</p>
      <MenuEditor initial={await adminMenu(db)} />
    </>
  );
}
