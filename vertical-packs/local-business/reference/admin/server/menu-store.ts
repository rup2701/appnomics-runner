import type { Db, Q } from "./db-types";
import type { SheetCategory } from "./menu-sheet";

/** The menu in the database. Section and dish order is kept by position. A hidden dish stays in the admin and is left off the page. */
export type StoredItem = { name: string; price?: string; description?: string; hidden?: boolean };
export type StoredCategory = { name: string; items: StoredItem[] };

export const LIMITS = { sections: 12, perSection: 40, name: 80, section: 40, price: 20, description: 200 };

const clean = (v: unknown): string => String(v ?? "").replace(/\s+/g, " ").trim();
const unsafe = (s: string): boolean => /[<>]|https?:\/\/|www\./i.test(s);

/** A menu from the editor or a file, checked the same way as in the Builder. Returns the first problem in plain words. */
export function checkMenu(input: unknown): { ok: true; categories: StoredCategory[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) return { ok: false, error: "The menu is not in the right shape." };
  if (input.length > LIMITS.sections) return { ok: false, error: `Keep the menu to ${LIMITS.sections} sections or fewer.` };
  const out: StoredCategory[] = [];
  for (const raw of input as { name?: unknown; items?: unknown }[]) {
    const name = clean(raw?.name);
    if (!name) return { ok: false, error: "Every section needs a name." };
    if (name.length > LIMITS.section || unsafe(name)) return { ok: false, error: `The section name "${name.slice(0, 30)}" is not allowed (too long, or it has a link).` };
    const items = Array.isArray(raw?.items) ? (raw.items as Record<string, unknown>[]) : [];
    if (items.length > LIMITS.perSection) return { ok: false, error: `${name} has more than ${LIMITS.perSection} dishes.` };
    const kept: StoredItem[] = [];
    for (const it of items) {
      const n = clean(it?.name);
      const price = clean(it?.price);
      const description = clean(it?.description);
      if (!n && !price && !description) continue; // an empty row the owner never filled in
      if (!n) return { ok: false, error: `A dish in ${name} has no name.` };
      if (n.length > LIMITS.name || price.length > LIMITS.price || description.length > LIMITS.description) return { ok: false, error: `"${n.slice(0, 30)}" has a name, price or description that is too long.` };
      if ([n, price, description].some(unsafe)) return { ok: false, error: `"${n.slice(0, 30)}" has a link or markup in it.` };
      kept.push({ name: n, ...(price ? { price } : {}), ...(description ? { description } : {}), ...(it?.hidden === true ? { hidden: true } : {}) });
    }
    out.push({ name, items: kept });
  }
  return { ok: true, categories: out };
}

async function write(q: Q, categories: StoredCategory[]) {
  await q("delete from menu_categories");
  for (let i = 0; i < categories.length; i++) {
    const [c] = await q("insert into menu_categories (position, name) values ($1, $2) returning id", [i, categories[i].name]);
    for (let j = 0; j < categories[i].items.length; j++) {
      const it = categories[i].items[j];
      await q("insert into menu_items (category_id, position, name, price, description, hidden) values ($1,$2,$3,$4,$5,$6)", [c.id, j, it.name, it.price ?? null, it.description ?? null, it.hidden === true]);
    }
  }
}

/**
 * The first time the database is used, the menu from the brief (baked into the site) is copied in. Once it has been copied the database is the menu,
 * even if the owner later deletes every dish. Two visitors at the same moment cannot both copy it.
 */
export async function ensureSeeded(db: Db, baked: StoredCategory[]): Promise<void> {
  const [m] = await db.q("select value from site_meta where key = 'menu_managed'");
  if (m) return;
  await db.tx(async (q) => {
    const won = await q("insert into site_meta (key, value) values ('menu_managed', 'true') on conflict (key) do nothing returning key");
    if (!won.length) return;
    // The built-in menu was already checked at build time. It is copied as it is, only clipped to the limits, never dropped.
    const clip = (v: unknown, n: number) => clean(v).slice(0, n);
    const copy: StoredCategory[] = baked.slice(0, LIMITS.sections).map((c) => ({
      name: clip(c.name, LIMITS.section) || "Menu",
      items: c.items.slice(0, LIMITS.perSection).filter((i) => clip(i.name, LIMITS.name)).map((i) => ({
        name: clip(i.name, LIMITS.name),
        ...(clip(i.price, LIMITS.price) ? { price: clip(i.price, LIMITS.price) } : {}),
        ...(clip(i.description, LIMITS.description) ? { description: clip(i.description, LIMITS.description) } : {}),
      })),
    }));
    await write(q, copy);
  });
}

/** Everything, in order, with hidden dishes. For the admin screen and the download. */
export async function adminMenu(db: Db): Promise<StoredCategory[]> {
  const cats = await db.q("select id, name from menu_categories order by position, id");
  const items = await db.q("select category_id, name, price, description, hidden from menu_items order by position, id");
  return cats.map((c) => ({
    name: String(c.name),
    items: items.filter((i) => i.category_id === c.id).map((i) => ({ name: String(i.name), ...(i.price ? { price: String(i.price) } : {}), ...(i.description ? { description: String(i.description) } : {}), ...(i.hidden ? { hidden: true } : {}) })),
  }));
}

/** What the page shows: no hidden dishes, and no section left with nothing in it. */
export async function publicMenu(db: Db): Promise<{ name: string; items: { name: string; price?: string; description?: string }[] }[]> {
  return (await adminMenu(db))
    .map((c) => ({ name: c.name, items: c.items.filter((i) => !i.hidden).map(({ hidden: _h, ...rest }) => rest) }))
    .filter((c) => c.items.length > 0);
}

/** The owner's edit, or a spreadsheet that replaces the menu: exactly what was sent, in the order sent. */
export async function replaceMenu(db: Db, categories: StoredCategory[]): Promise<void> {
  await db.tx(async (q) => {
    await write(q, categories);
    await q("insert into site_meta (key, value) values ('menu_managed', 'true') on conflict (key) do nothing");
  });
}

/** Adds sections and dishes that are not there yet. A dish already in a section (same name, ignoring case) is skipped and named. Nothing existing is changed. */
export async function addToMenu(db: Db, incoming: SheetCategory[]): Promise<{ added: number; skipped: string[] }> {
  const cur = await adminMenu(db);
  let added = 0;
  const skipped: string[] = [];
  for (const inc of incoming) {
    let cat = cur.find((c) => c.name.toLowerCase() === inc.name.toLowerCase());
    if (!cat) { cat = { name: inc.name, items: [] }; cur.push(cat); }
    for (const it of inc.items) {
      if (cat.items.some((x) => x.name.toLowerCase() === it.name.toLowerCase())) { skipped.push(`${it.name} (already in ${cat.name})`); continue; }
      cat.items.push({ ...it });
      added++;
    }
  }
  const checked = checkMenu(cur);
  if (!checked.ok) throw new Error(checked.error);
  await replaceMenu(db, checked.categories);
  return { added, skipped };
}

export const countDishes = (cats: { items: unknown[] }[]): number => cats.reduce((n, c) => n + c.items.length, 0);

/** The menu as a spreadsheet the owner can edit and send back. Cells that start with = + - @ are quoted so a spreadsheet program never treats them as formulas. */
export function menuCsv(cats: StoredCategory[]): string {
  const cell = (v: string) => {
    const safe = /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const rows = [["Section", "Dish", "Price", "Description"]];
  for (const c of cats) for (const i of c.items) rows.push([c.name, i.name, i.price ?? "", i.description ?? ""]);
  return rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
