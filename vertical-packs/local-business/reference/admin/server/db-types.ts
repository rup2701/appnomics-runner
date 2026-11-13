/** One small interface over the database, so the rules can be tested without a server. */
export type Row = Record<string, unknown>;
export type Q = (text: string, params?: unknown[]) => Promise<Row[]>;
export type Db = { q: Q; tx: <T>(fn: (q: Q) => Promise<T>) => Promise<T> };
