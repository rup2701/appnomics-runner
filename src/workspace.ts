// Makes a fresh folder and a fresh database for one run.
import { cp, mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { config } from "./config.js";

const run = promisify(execFile);

export type Workspace = { runId: string; root: string; appDir: string; dbName: string; databaseUrl: string };

export async function createWorkspace(opts: {
  prompt: string; specsDir: string; brief: unknown; runsDir: string; skipDb?: boolean;
}): Promise<Workspace> {
  const slug = opts.prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "run";
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const runId = `${stamp}-${slug}`;
  const root = path.resolve(opts.runsDir, runId);
  const appDir = path.join(root, "app");
  await mkdir(appDir, { recursive: true });
  await cp(opts.specsDir, path.join(appDir, "specs"), { recursive: true });
  await writeFile(path.join(appDir, "specs", "brief.json"), JSON.stringify(opts.brief, null, 2));

  const dbName = `run_${stamp}_${Math.random().toString(36).slice(2, 6)}`;
  const databaseUrl = `${config.dbBaseUrl}/${dbName}`;
  if (!opts.skipDb) await run("createdb", [dbName]);
  await writeFile(path.join(appDir, ".env"), `DATABASE_URL=${databaseUrl}\n`);

  const git = (...args: string[]) =>
    run("git", ["-C", appDir, "-c", "user.name=runner", "-c", "user.email=runner@appnomics.invalid", ...args]);
  await git("init", "-q");
  await writeFile(path.join(appDir, ".gitignore"), "node_modules\n.next\n.env\n.uploads\n");
  await git("add", "-A");
  await git("commit", "-q", "-m", "Specs and brief");
  return { runId, root, appDir, dbName, databaseUrl };
}
