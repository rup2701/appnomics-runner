// The only things the agent can do. Each tool is narrow, and every path is held inside the app folder.
// This stops accidents. It is NOT a security sandbox: run it on a machine where that is acceptable.
import type Anthropic from "@anthropic-ai/sdk";
import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { config } from "./config.js";

export const toolDefs: Anthropic.Tool[] = [
  {
    name: "list_files",
    description: "List files and folders in a directory inside the app folder. Skips node_modules and .next.",
    input_schema: { type: "object", properties: { path: { type: "string", description: "Relative path, '.' for the root" } }, required: ["path"] },
  },
  {
    name: "read_file",
    description: "Read a text file inside the app folder. Optional 1-based line offset and limit for long files.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" }, offset: { type: "number" }, limit: { type: "number" } },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Create or overwrite a file inside the app folder. specs/ and .git/ are read-only.",
    input_schema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] },
  },
  {
    name: "run_command",
    description:
      "Run one command in the app folder, without a shell. Allowed: npm (install, ci, run, test), npx (tsc, next, drizzle-kit, playwright, tsx, shadcn), " +
      "node, and git (status, add, commit, diff, log, tag). Output is trimmed to the last part.",
    input_schema: {
      type: "object",
      properties: { command: { type: "string" }, args: { type: "array", items: { type: "string" } } },
      required: ["command", "args"],
    },
  },
];

const NPX_OK = new Set(["tsc", "next", "drizzle-kit", "playwright", "tsx", "shadcn", "shadcn@latest", "eslint", "prettier"]);
const GIT_OK = new Set(["status", "add", "commit", "diff", "log", "tag", "show"]);
const NPM_OK = new Set(["install", "i", "ci", "run", "test", "ls"]);

export function inside(appDir: string, rel: string): string {
  const full = path.resolve(appDir, rel);
  if (full !== appDir && !full.startsWith(appDir + path.sep)) throw new Error(`Path escapes the app folder: ${rel}`);
  return full;
}

function trim(text: string): string {
  const limit = config.toolOutputLimit;
  return text.length <= limit ? text : `[output trimmed to the last ${limit} characters]\n` + text.slice(-limit);
}

export function checkCommand(command: string, args: string[]): string | null {
  if (command === "node") return null;
  if (command === "npm") return NPM_OK.has(args[0] ?? "") ? null : `npm ${args[0] ?? ""} is not allowed`;
  if (command === "npx") {
    const first = args.find((a) => !a.startsWith("-")) ?? "";
    return NPX_OK.has(first) ? null : `npx ${first} is not allowed`;
  }
  if (command === "git") return GIT_OK.has(args[0] ?? "") ? null : `git ${args[0] ?? ""} is not allowed`;
  return `${command} is not an allowed command`;
}

export function makeHandlers(appDir: string, env: Record<string, string>) {
  return {
    async list_files(input: { path: string }) {
      const dir = inside(appDir, input.path);
      const entries = await readdir(dir, { withFileTypes: true });
      return entries
        .filter((e) => e.name !== "node_modules" && e.name !== ".next" && e.name !== ".git")
        .map((e) => (e.isDirectory() ? e.name + "/" : e.name))
        .sort()
        .join("\n");
    },
    async read_file(input: { path: string; offset?: number; limit?: number }) {
      const full = inside(appDir, input.path);
      if ((await stat(full)).size > 2_000_000) throw new Error("File is larger than 2 MB");
      const lines = (await readFile(full, "utf8")).split("\n");
      const start = Math.max((input.offset ?? 1) - 1, 0);
      const slice = lines.slice(start, input.limit ? start + input.limit : undefined);
      return trim(slice.map((l, i) => `${start + i + 1}\t${l}`).join("\n"));
    },
    async write_file(input: { path: string; content: string }) {
      const full = inside(appDir, input.path);
      const rel = path.relative(appDir, full).split(path.sep);
      if (rel[0] === "specs" || rel[0] === ".git") throw new Error(`${rel[0]}/ is read-only`);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, input.content);
      return `Wrote ${input.content.length} characters to ${input.path}`;
    },
    run_command(input: { command: string; args: string[] }): Promise<string> {
      const refusal = checkCommand(input.command, input.args);
      if (refusal) return Promise.reject(new Error(refusal));
      return new Promise((resolve) => {
        execFile(input.command, input.args, { cwd: appDir, env, timeout: config.commandTimeoutMs, maxBuffer: 20_000_000 }, (err, stdout, stderr) => {
          const code = err ? ((err as NodeJS.ErrnoException & { code?: number | string }).code ?? 1) : 0;
          resolve(trim(`exit code: ${code}\n${stdout}${stderr ? "\n[stderr]\n" + stderr : ""}`));
        });
      });
    },
  };
}

// The agent's commands see only what they need. API keys and tokens are left out on purpose.
export function agentEnv(databaseUrl: string): Record<string, string> {
  const keep = ["PATH", "HOME", "USER", "LANG", "TMPDIR", "PLAYWRIGHT_BROWSERS_PATH", "NODE_PATH"];
  const env: Record<string, string> = { DATABASE_URL: databaseUrl, CI: "1" };
  for (const k of keep) if (process.env[k]) env[k] = process.env[k]!;
  return env;
}
