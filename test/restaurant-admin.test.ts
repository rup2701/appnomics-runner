// The restaurant's own database, owner sign-in, menu store and table requests (reference/server and reference/db), against an in-memory Postgres.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { addAdmin, exportNameOf, patchPage } from "../src/add-admin";
import { PGlite } from "@electric-sql/pglite";
import type { Db, Q } from "../vertical-packs/local-business/reference/admin/server/db-types";
import { addToMenu, adminMenu, checkMenu, countDishes, ensureSeeded, menuCsv, publicMenu, replaceMenu } from "../vertical-packs/local-business/reference/admin/server/menu-store";
import { menuFromRows, parseCsv } from "../vertical-packs/local-business/reference/admin/server/menu-sheet";
import { checkSession, makeSession, sameOrigin, verifyPassword, recordFailure, tooManyFailures } from "../vertical-packs/local-business/reference/admin/server/auth";
import { checkRequest, handleReservation, requestEmail } from "../vertical-packs/local-business/reference/admin/server/reserve";

const ref = path.join(process.cwd(), "vertical-packs/local-business/reference");
let failed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  try { await fn(); console.log("PASS " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n  " + (e instanceof Error ? e.stack ?? e.message : e)); }
}

async function freshDb(): Promise<Db> {
  const pg = new PGlite();
  await pg.exec(readFileSync(path.join(ref, "admin/db/0000_init.sql"), "utf8"));
  const wrap = (c: { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }): Q => async (t, p = []) => (await c.query(t, p)).rows as Record<string, unknown>[];
  return { q: wrap(pg), tx: (fn) => pg.transaction((t) => fn(wrap(t))) };
}

const baked = [{ name: "Starters", items: [{ name: "Samosa", price: "$5", description: "Crisp" }, { name: "Soup" }] }, { name: "Mains", items: [{ name: "Plov", price: "$14" }] }];

await test("the migration creates the tables and can be applied twice", async () => {
  const pg = new PGlite();
  const sql = readFileSync(path.join(ref, "admin/db/0000_init.sql"), "utf8");
  await pg.exec(sql);
  await pg.exec(sql);
  const t = (await pg.query("select table_name from information_schema.tables where table_schema = 'public' order by 1")).rows.map((r) => (r as { table_name: string }).table_name);
  for (const n of ["admin_login_failures", "menu_categories", "menu_items", "site_meta", "table_requests"]) assert.ok(t.includes(n), n);
});

await test("the menu from the brief is copied in once, and a later edit is never undone by it", async () => {
  const db = await freshDb();
  await ensureSeeded(db, baked);
  assert.equal(countDishes(await adminMenu(db)), 3);
  await replaceMenu(db, [{ name: "Only", items: [{ name: "One" }] }]);
  await ensureSeeded(db, baked); // a later page view must not bring the old menu back
  assert.deepEqual((await adminMenu(db)).map((c) => c.name), ["Only"]);
  await replaceMenu(db, []);
  await ensureSeeded(db, baked); // even an emptied menu stays emptied
  assert.equal(countDishes(await adminMenu(db)), 0);
});

await test("two visitors at the same moment seed the menu once", async () => {
  const db = await freshDb();
  await Promise.all([ensureSeeded(db, baked), ensureSeeded(db, baked), ensureSeeded(db, baked)]);
  assert.equal(countDishes(await adminMenu(db)), 3);
});

await test("order is kept, a hidden dish is left off the page but stays in the admin, and an empty section is not shown", async () => {
  const db = await freshDb();
  await replaceMenu(db, [
    { name: "B", items: [{ name: "z" }, { name: "a", price: "$1", hidden: true }, { name: "m" }] },
    { name: "A", items: [{ name: "only hidden", hidden: true }] },
  ]);
  const admin = await adminMenu(db);
  assert.deepEqual(admin.map((c) => c.name), ["B", "A"]);
  assert.deepEqual(admin[0].items.map((i) => i.name), ["z", "a", "m"]);
  assert.equal(admin[0].items[1].hidden, true);
  const pub = await publicMenu(db);
  assert.deepEqual(pub.map((c) => c.name), ["B"]);
  assert.deepEqual(pub[0].items.map((i) => i.name), ["z", "m"]);
});

await test("a replacement is exactly the file; an add only adds what is missing and names what it skipped", async () => {
  const db = await freshDb();
  await replaceMenu(db, [{ name: "Mains", items: [{ name: "Plov", price: "$14" }] }]);
  const file = menuFromRows(parseCsv("Section,Dish,Price\nMains,plov,$99\nMains,Lagman,$13\nSides,Naan,$3\n"));
  assert.ok(file.ok);
  if (!file.ok) return;
  const r = await addToMenu(db, file.categories);
  assert.equal(r.added, 2);
  assert.deepEqual(r.skipped, ["plov (already in Mains)"]);
  const m = await adminMenu(db);
  assert.equal(m[0].items.find((i) => i.name === "Plov")?.price, "$14", "an existing dish is not changed");
  assert.deepEqual(m.map((c) => c.name), ["Mains", "Sides"]);
  await replaceMenu(db, file.categories);
  assert.equal(countDishes(await adminMenu(db)), 3);
});

await test("the menu round-trips through the download and the upload", async () => {
  const db = await freshDb();
  const original = [{ name: "Mains", items: [{ name: 'Fish, "fresh"', price: "$12.50", description: "With chips" }, { name: "=SUM(A1)" }] }];
  await replaceMenu(db, original);
  const csv = menuCsv(await adminMenu(db));
  assert.match(csv, /'=SUM\(A1\)/, "a cell that starts with = is quoted so a spreadsheet does not run it");
  const back = menuFromRows(parseCsv(csv));
  assert.ok(back.ok);
  if (back.ok) assert.deepEqual(back.categories[0].items[0], original[0].items[0]);
});

await test("the menu editor's input is checked: limits, links, empty rows", () => {
  assert.ok(checkMenu([{ name: "A", items: [{ name: "x" }, { name: "", price: "", description: "" }] }]).ok);
  const ok = checkMenu([{ name: "A", items: [{ name: "x" }, { name: "" }] }]);
  assert.ok(ok.ok && ok.categories[0].items.length === 1, "an empty row is dropped");
  assert.ok(!checkMenu([{ name: "", items: [] }]).ok);
  assert.ok(!checkMenu([{ name: "A", items: [{ name: "see https://x.example" }] }]).ok);
  assert.ok(!checkMenu([{ name: "A", items: [{ name: "<b>x</b>" }] }]).ok);
  assert.ok(!checkMenu([{ name: "A", items: [{ name: "", price: "$5" }] }]).ok, "a price with no dish is an error, not a guess");
  assert.ok(!checkMenu(Array.from({ length: 13 }, (_, i) => ({ name: "S" + i, items: [] }))).ok);
  assert.ok(!checkMenu("nope").ok);
});

await test("the password script and the sign-in check agree; a session is signed, bound to the owner and expires", () => {
  const hash = execFileSync("node", [path.join(ref, "admin/scripts/hash-password.mjs"), "correct horse"]).toString().trim();
  assert.match(hash, /^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.ok(verifyPassword("correct horse", hash));
  assert.ok(!verifyPassword("wrong", hash));
  assert.ok(!verifyPassword("correct horse", undefined));
  assert.ok(!verifyPassword("correct horse", "bcrypt:abc"));
  const now = 1_700_000_000_000;
  const s = makeSession("Owner@Example.com", "secret", now);
  assert.ok(checkSession(s, "owner@example.com", "secret", now + 1000));
  assert.ok(!checkSession(s, "other@example.com", "secret", now + 1000), "a cookie for one owner is not valid for another");
  assert.ok(!checkSession(s, "owner@example.com", "other secret", now + 1000));
  assert.ok(!checkSession(s + "x", "owner@example.com", "secret", now + 1000));
  assert.ok(!checkSession(s, "owner@example.com", "secret", now + 8 * 86_400_000), "after a week it expires");
  assert.ok(!checkSession(undefined, "owner@example.com", "secret"));
  assert.ok(sameOrigin("https://a.example", "a.example") && !sameOrigin("https://evil.example", "a.example") && !sameOrigin(null, "a.example"));
});

await test("repeated wrong passwords from one address are stopped", async () => {
  const db = await freshDb();
  for (let i = 0; i < 9; i++) await recordFailure(db, "h1");
  assert.equal(await tooManyFailures(db, "h1"), false);
  await recordFailure(db, "h1");
  assert.equal(await tooManyFailures(db, "h1"), true);
  assert.equal(await tooManyFailures(db, "h2"), false);
});

const today = "2026-11-13";
await test("a table request is checked in the guest's words", () => {
  const good = { name: "Ana", phone: "510 555 0100", day: "2026-11-20", time: "19:30", party: 4 };
  assert.ok(checkRequest(good, today).ok);
  const bad = (patch: object) => { const r = checkRequest({ ...good, ...patch }, today); return r.ok ? "" : r.error; };
  assert.match(bad({ name: "" }), /your name/);
  assert.match(bad({ phone: "", email: "" }), /phone number or an email/);
  assert.match(bad({ email: "nope", phone: "" }), /phone number or an email/);
  assert.match(bad({ day: "2026-11-01" }), /today or a later date/);
  assert.match(bad({ day: "2027-06-01" }), /six months/);
  assert.match(bad({ day: "2026-02-30" }), /choose a date/);
  assert.match(bad({ party: 25 }), /more than 20/);
  assert.match(bad({ time: "7pm" }), /choose a time/);
});

await test("a request is saved before the email, a failed email loses nothing, a bot gets a thank-you and nothing is stored", async () => {
  const db = await freshDb();
  const sent: string[] = [];
  const ctx = (mail: (to: string) => Promise<boolean>) => ({ ip: "1.2.3.4", salt: "s", siteName: "Test Kitchen", ownerEmail: "owner@example.com", now: new Date("2026-11-13T12:00:00Z"), mail: async (to: string) => { sent.push(to); return mail(to); } });
  const req = { name: "Ana", phone: "510 555 0100", day: "2026-11-20", time: "19:30", party: 4, note: "Window please" };
  const a = await handleReservation(db, req, ctx(async () => true));
  assert.deepEqual(a, { status: 200, body: { ok: true } });
  assert.deepEqual(sent, ["owner@example.com"]);
  assert.equal((await db.q("select emailed from table_requests"))[0].emailed, true);
  const b = await handleReservation(db, { ...req, name: "Ben" }, ctx(async () => { throw new Error("boom"); }));
  assert.equal(b.status, 200);
  const rows = await db.q("select guest_name, emailed, status from table_requests order by created_at, guest_name");
  assert.equal(rows.length, 2);
  assert.equal(rows.find((r) => r.guest_name === "Ben")?.emailed, false, "the request is kept when the email fails");
  const bot = await handleReservation(db, { ...req, website: "http://spam" }, ctx(async () => true));
  assert.deepEqual(bot, { status: 200, body: { ok: true } });
  assert.equal((await db.q("select count(*)::int as n from table_requests"))[0].n, 2);
  const bad = await handleReservation(db, { ...req, party: 0 }, ctx(async () => true));
  assert.equal(bad.status, 422);
});

await test("one visitor is limited to five an hour, a whole site to thirty", async () => {
  const db = await freshDb();
  const c = (ip: string) => ({ ip, salt: "s", siteName: "T", now: new Date("2026-11-13T12:00:00Z"), mail: async () => true });
  const req = { name: "Ana", phone: "510 555 0100", day: "2026-11-20", time: "19:30", party: 2 };
  for (let i = 0; i < 5; i++) assert.equal((await handleReservation(db, req, c("9.9.9.9"))).status, 200);
  assert.equal((await handleReservation(db, req, c("9.9.9.9"))).status, 429);
  for (let i = 0; i < 25; i++) assert.equal((await handleReservation(db, req, c("10.0.0." + i))).status, 200);
  assert.equal((await handleReservation(db, req, c("8.8.8.8"))).status, 429);
});

await test("the owner email escapes what the guest typed", () => {
  const m = requestEmail("Joe's <Grill>", { name: "<img src=x onerror=1>", phone: "", email: "a@b.co", day: "2026-11-20", time: "19:30", party: 2, note: "" });
  assert.ok(!m.html.includes("<img"));
  assert.ok(m.html.includes("&lt;img"));
  assert.match(m.subject, /Table request for Joe's <Grill>: 2 on 2026-11-20 at 19:30/);
});


const HOME = `import type { Metadata } from "next";
import { RestaurantPage } from "../components/restaurant/RestaurantPage";
import { content } from "../content/site";

export const metadata: Metadata = { title: content.name, description: content.tagline };

export default function Home() {
  return <RestaurantPage c={content} />;
}
`;
const MENU = `import { notFound } from "next/navigation";
import { MenuPage } from "../../components/restaurant/MenuPage";
import { hasMenu } from "../../lib/content";
import { content } from "../../content/site";

export default function Menu() {
  if (!hasMenu(content)) notFound();
  return <MenuPage c={content} />;
}
`;

await test("a page is made to read getContent(), keeping its metadata, and doing it twice changes nothing more", () => {
  const home = patchPage(HOME, "content", "src/app/page.tsx");
  assert.match(home, /import \{ getContent \} from "\.\.\/lib\/site-content";/);
  assert.match(home, /export const metadata: Metadata = \{ title: content\.name/);
  assert.match(home, /export default async function Home\(\) \{\n  const c = await getContent\(\);/);
  assert.match(home, /c=\{c\}/);
  assert.match(home, /export const revalidate = 60;/);
  assert.equal(patchPage(home, "content", "src/app/page.tsx"), home);
  const menu = patchPage(MENU, "content", "src/app/menu/page.tsx");
  assert.match(menu, /from "\.\.\/\.\.\/lib\/site-content"/);
  assert.match(menu, /hasMenu\(c\)/);
  assert.match(menu, /c=\{c\}/);
  assert.throws(() => patchPage("export const x = 1;", "content", "src/app/page.tsx"), /export default function/);
  assert.throws(() => patchPage("export default function A() { return null; }", "content", "src/app/page.tsx"), /does not pass the site's content/);
});

await test("the content file's export is found, named or default", () => {
  assert.deepEqual(exportNameOf("export const content: Content = {}"), { kind: "named", name: "content" });
  assert.deepEqual(exportNameOf("export const site = {}"), { kind: "named", name: "site" });
  assert.deepEqual(exportNameOf("const x = {};\nexport default x;"), { kind: "default" });
  assert.throws(() => exportNameOf("const x = 1"));
});

await test("adding the owner area to a finished restaurant site copies the files, patches the pages and package.json, and can be run again", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "rb-admin-"));
  const w = async (f: string, t: string) => { await mkdir(path.dirname(path.join(dir, f)), { recursive: true }); await writeFile(path.join(dir, f), t); };
  await w("src/content/site.ts", "export const content = {};\n");
  await w("src/components/restaurant/RestaurantPage.tsx", "export {};\n");
  await w("src/app/page.tsx", HOME);
  await w("src/app/menu/page.tsx", MENU);
  await w("package.json", JSON.stringify({ name: "x", scripts: { build: "next build" }, dependencies: { next: "15.0.0" } }));
  const r = await addAdmin(dir);
  for (const f of ["src/lib/db.ts", "src/lib/auth.ts", "src/lib/site-content.ts", "src/lib/baked.ts", "src/app/admin/menu/MenuEditor.tsx", "src/app/api/reserve/route.ts", "src/styles/admin.css", "drizzle/0000_init.sql", "scripts/migrate.mjs", "scripts/hash-password.mjs"]) {
    assert.ok(r.files.includes(f), f + " is copied");
  }
  const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8"));
  assert.equal(pkg.scripts["db:migrate"], "node scripts/migrate.mjs");
  assert.equal(pkg.scripts["hash-password"], "node scripts/hash-password.mjs");
  assert.equal(pkg.scripts.build, "next build");
  assert.ok(pkg.dependencies.postgres && pkg.dependencies.fflate && pkg.dependencies.next === "15.0.0");
  assert.match(await readFile(path.join(dir, "src/lib/baked.ts"), "utf8"), /import \{ content as built \} from "\.\.\/content\/site"/);
  const env = await readFile(path.join(dir, ".env.example"), "utf8");
  for (const k of ["DATABASE_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD_HASH", "SESSION_SECRET"]) assert.match(env, new RegExp("^" + k + "=", "m"));
  const once = await readFile(path.join(dir, "src/app/page.tsx"), "utf8");
  await addAdmin(dir);
  assert.equal(await readFile(path.join(dir, "src/app/page.tsx"), "utf8"), once);
  assert.equal((await readFile(path.join(dir, ".env.example"), "utf8")).match(/^DATABASE_URL=/gm)?.length, 1);
  // A site whose page cannot be patched is refused before any file is written.
  const bad = await mkdtemp(path.join(tmpdir(), "rb-admin-bad-"));
  await mkdir(path.join(bad, "src/content"), { recursive: true });
  await mkdir(path.join(bad, "src/components/restaurant"), { recursive: true });
  await mkdir(path.join(bad, "src/app"), { recursive: true });
  await writeFile(path.join(bad, "src/content/site.ts"), "export const content = {};");
  await writeFile(path.join(bad, "src/components/restaurant/RestaurantPage.tsx"), "export {};");
  await writeFile(path.join(bad, "src/app/page.tsx"), "export const x = 1;");
  await assert.rejects(() => addAdmin(bad), /export default function/);
  await assert.rejects(() => readFile(path.join(bad, "src/lib/db.ts"), "utf8"), /ENOENT/);
});

if (failed) { console.log(failed + " failed"); process.exit(1); }
console.log("restaurant-admin tests passed");
