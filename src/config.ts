// Everything tunable lives here. Prices are estimates in dollars per million tokens.
// Cache writes are the 5 minute rate, 1.25 times the input price.
export type Prices = { input: number; output: number; cacheRead: number; cacheWrite: number };

export const PRICES: Record<string, Prices> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
};

/** Prices for a model. A model not in the table is priced as Opus, the dearer one, so the cost limit never stops late. */
export function pricesFor(model: string): Prices {
  return PRICES[model] ?? PRICES["claude-opus-5-5"];
}

const model = process.env.RUNNER_MODEL ?? "claude-opus-5-5";

export const config = {
  model,
  maxTurns: Number(process.env.RUNNER_MAX_TURNS ?? 150),
  maxCostUsd: Number(process.env.RUNNER_MAX_COST_USD ?? 15),
  commandTimeoutMs: 10 * 60 * 1000,
  toolOutputLimit: 12_000,
  prices: pricesFor(model),
  // Where run databases are created. Your local Postgres user must be able to create databases.
  dbBaseUrl: process.env.RUNNER_DB_BASE_URL ?? "postgres://localhost:5432",
};

export type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number };

export const emptyUsage = (): Usage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });

export function addUsage(total: Usage, u: {
  input_tokens?: number | null; output_tokens?: number | null;
  cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null;
}): void {
  total.input += u.input_tokens ?? 0;
  total.output += u.output_tokens ?? 0;
  total.cacheRead += u.cache_read_input_tokens ?? 0;
  total.cacheWrite += u.cache_creation_input_tokens ?? 0;
}

export function costUsd(u: Usage): number {
  const p = config.prices;
  return (u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite) / 1e6;
}
