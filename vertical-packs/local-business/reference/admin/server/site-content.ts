import type { Content } from "../lib/content";
import { baked } from "./baked";
import { dbConfigured, getDb } from "./db";
import { ensureSeeded, publicMenu } from "./menu-store";

/**
 * What the pages draw. Without a database it is the content written at build time. With one, the menu comes from the database and table requests
 * post to this site's own /api/reserve. If the database cannot be reached the page falls back to the built-in menu, so it is never blank.
 */
export async function getContent(): Promise<Content> {
  if (!dbConfigured()) return baked;
  try {
    const db = getDb();
    await ensureSeeded(db, baked.menu.categories);
    const categories = await publicMenu(db);
    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
    return {
      ...baked,
      menu: { ...baked.menu, categories },
      reservations: site ? { endpoint: `${site}/api/reserve` } : baked.reservations,
    };
  } catch (e) {
    console.error("menu from the database failed, using the built-in menu:", e instanceof Error ? e.message : e);
    return baked;
  }
}
