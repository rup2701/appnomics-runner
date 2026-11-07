// A static site has no database, no owner area and no environment variables (the product showcase pack).
import { readFile } from "node:fs/promises";
import path from "node:path";

// "saas-showcase" is the old name of the product showcase kind; sites already built with it keep working.
export const STATIC_KINDS = ["product-showcase", "saas-showcase"];

export const isStaticBrief = (brief: unknown): boolean =>
  STATIC_KINDS.includes((brief as { site?: { kind?: string } } | null)?.site?.kind ?? "");

/** Reads the run's brief (root/brief.json, else app/specs/brief.json). A missing or broken brief means "not static". */
export async function isStaticRun(root: string): Promise<boolean> {
  for (const f of [path.join(root, "brief.json"), path.join(root, "app", "specs", "brief.json")]) {
    try { return isStaticBrief(JSON.parse(await readFile(f, "utf8"))); } catch { /* try the next file */ }
  }
  return false;
}
