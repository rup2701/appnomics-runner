import postgres from "postgres";

import type { Db, Q, Row } from "./db-types";
export type { Db, Q, Row } from "./db-types";

/** The site has a database only after the owner area was set up (the deploy script sets DATABASE_URL). */
export const dbConfigured = (): boolean => !!process.env.DATABASE_URL;

let sql: ReturnType<typeof postgres> | undefined;

export function getDb(): Db {
  if (!process.env.DATABASE_URL) throw new Error("This site has no database yet.");
  // prepare: false because the address is the pooled one.
  sql ??= postgres(process.env.DATABASE_URL, { max: 3, prepare: false, idle_timeout: 20, connect_timeout: 10, onnotice: () => {} });
  const s = sql;
  return {
    q: async (text, params = []) => (await s.unsafe(text, params as never[])) as unknown as Row[],
    tx: <T,>(fn: (q: Q) => Promise<T>) => s.begin(async (t) => fn(async (text, params = []) => (await t.unsafe(text, params as never[])) as unknown as Row[])) as Promise<T>,
  };
}
