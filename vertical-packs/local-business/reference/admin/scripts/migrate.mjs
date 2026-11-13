// Applies every drizzle/*.sql file once, in name order. Safe to run again. Reads DATABASE_URL.
import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) { console.error("Set DATABASE_URL."); process.exit(1); }
const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await sql`create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())`;
  const done = new Set((await sql`select name from _migrations`).map((r) => r.name));
  const dir = path.join(process.cwd(), "drizzle");
  for (const f of (await readdir(dir)).filter((n) => n.endsWith(".sql")).sort()) {
    if (done.has(f)) continue;
    await sql.begin(async (t) => {
      await t.unsafe(await readFile(path.join(dir, f), "utf8"));
      await t`insert into _migrations (name) values (${f})`;
    });
    console.log("applied " + f);
  }
} finally {
  await sql.end();
}
