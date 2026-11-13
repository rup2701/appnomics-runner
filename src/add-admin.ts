// Adds the owner area and the site's own database code to a finished restaurant site (stage two of a restaurant build).
// Plain file copies and small text patches, no model. Safe to run again: the same files end up in the same places.
// Nothing here talks to Neon or Vercel; deploy.ts does that. If a page cannot be patched this throws before anything is deployed,
// so the site that is already live is never touched by a failed attempt.
import { cp, mkdir, readdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ADMIN_REF = path.join(here, "..", "vertical-packs", "local-business", "reference", "admin");

const exists = (p: string) => access(p).then(() => true, () => false);

/** The name the site's content file exports: `export const content`, `export const site`, or a default export. */
export function exportNameOf(source: string): { kind: "named"; name: string } | { kind: "default" } {
  const named = /export\s+const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=/.exec(source);
  if (named) return { kind: "named", name: named[1] };
  if (/export\s+default\b/.test(source)) return { kind: "default" };
  throw new Error("Could not find what src/content/site.ts exports. Expected `export const content: Content = ...`.");
}

/** The glue file the owner-area code imports. It re-exports the site's built-in content as `baked`. */
export function bakedSource(e: ReturnType<typeof exportNameOf>): string {
  return `import type { Content } from "./content";\n${e.kind === "named" ? `import { ${e.name} as built } from "../content/site";` : `import built from "../content/site";`}\n\n/** The content written at build time. The menu in the database starts from it. */\nexport const baked: Content = built;\n`;
}

/**
 * Makes one page read its content through getContent(). The page keeps everything else it had (metadata and so on).
 * The component becomes async, `const c = await getContent()` is its first line, and the content name is replaced by `c` where the
 * page passes it to a component or asks hasMenu or hasStory. Throws when the page is not shaped the way the pack asks for.
 */
export function patchPage(source: string, contentName: string | null, file: string): string {
  if (source.includes("getContent(")) return source; // already done
  const fn = /export\s+default\s+(async\s+)?function\s+(\w*)\s*\(([^)]*)\)\s*(?::[^{]+)?\{/.exec(source);
  if (!fn) throw new Error(`${file} does not have an \`export default function\` page, so the owner area cannot be added to it.`);
  const name = contentName ?? "content";
  const uses = new RegExp(`\\b(c=\\{${name}\\}|hasMenu\\(${name}\\)|hasStory\\(${name}\\))`);
  if (!uses.test(source)) throw new Error(`${file} does not pass the site's content to a page component (c={${name}}), so the owner area cannot be added to it.`);

  const head = source.slice(0, fn.index);
  const body = source.slice(fn.index + fn[0].length);
  const rewritten = (body.replace(new RegExp(`c=\\{${name}\\}`, "g"), "c={c}")
    .replace(new RegExp(`\\b(hasMenu|hasStory)\\(${name}\\)`, "g"), "$1(c)"));
  const opening = fn[0].replace(/export\s+default\s+(async\s+)?function/, "export default async function");

  // Import getContent next to the other imports, relative to this page.
  const depth = file.split("/").length - 3; // src/app/page.tsx -> 0 folders below app; src/app/menu/page.tsx -> 1
  const rel = `${"../".repeat(depth + 1)}lib/site-content`;
  let withImport = head;
  const imports = [...head.matchAll(/^import[^;]*;\s*$/gm)];
  const importLine = `import { getContent } from "${rel}";\n`;
  if (imports.length) {
    const last = imports[imports.length - 1];
    const at = last.index! + last[0].length;
    withImport = head.slice(0, at) + (head[at - 1] === "\n" ? "" : "\n") + importLine + head.slice(at);
  } else withImport = importLine + head;
  const revalidate = /export\s+const\s+revalidate\b/.test(withImport) ? "" : "\n// The menu comes from the site's database and is kept for a minute; saving in the owner area refreshes it at once.\nexport const revalidate = 60;\n";
  return `${withImport}${revalidate}\n${opening}\n  const c = await getContent();${rewritten}`;
}

async function copyTree(from: string, to: string, written: string[], root: string) {
  await mkdir(to, { recursive: true });
  for (const e of await readdir(from, { withFileTypes: true })) {
    const src = path.join(from, e.name);
    const dst = path.join(to, e.name);
    if (e.isDirectory()) await copyTree(src, dst, written, root);
    else { await cp(src, dst); written.push(path.relative(root, dst)); }
  }
}

export async function addAdmin(appDir: string, refDir = ADMIN_REF): Promise<{ files: string[] }> {
  const site = path.join(appDir, "src", "content", "site.ts");
  if (!(await exists(site))) throw new Error("This is not a restaurant site: src/content/site.ts is missing.");
  if (!(await exists(path.join(appDir, "src", "components", "restaurant", "RestaurantPage.tsx")))) throw new Error("This is not a restaurant site: the restaurant components are missing.");
  const files: string[] = [];

  // Pages first, so a page that cannot be patched stops everything before a single file is written.
  const siteSource = await readFile(site, "utf8");
  const exp = exportNameOf(siteSource);
  const patched: [string, string][] = [];
  for (const rel of ["src/app/page.tsx", "src/app/menu/page.tsx", "src/app/story/page.tsx"]) {
    const p = path.join(appDir, rel);
    if (!(await exists(p))) { if (rel.endsWith("story/page.tsx")) continue; throw new Error(`${rel} is missing.`); }
    patched.push([p, patchPage(await readFile(p, "utf8"), exp.kind === "named" ? exp.name : null, rel)]);
  }

  await copyTree(path.join(refDir, "server"), path.join(appDir, "src", "lib"), files, appDir);
  await copyTree(path.join(refDir, "app"), path.join(appDir, "src", "app"), files, appDir);
  await mkdir(path.join(appDir, "src", "styles"), { recursive: true });
  await cp(path.join(refDir, "admin.css"), path.join(appDir, "src", "styles", "admin.css"));
  files.push("src/styles/admin.css");
  await copyTree(path.join(refDir, "db"), path.join(appDir, "drizzle"), files, appDir);
  await copyTree(path.join(refDir, "scripts"), path.join(appDir, "scripts"), files, appDir);
  await writeFile(path.join(appDir, "src", "lib", "baked.ts"), bakedSource(exp));
  files.push("src/lib/baked.ts");
  for (const [p, text] of patched) { await writeFile(p, text); files.push(path.relative(appDir, p)); }

  // package.json: two dependencies and the two scripts the deploy script runs by name.
  const pkgPath = path.join(appDir, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  pkg.dependencies = { ...pkg.dependencies, postgres: pkg.dependencies?.postgres ?? "^3.4.5", fflate: pkg.dependencies?.fflate ?? "^0.8.2" };
  pkg.scripts = { ...pkg.scripts, "db:migrate": "node scripts/migrate.mjs", "hash-password": "node scripts/hash-password.mjs" };
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  files.push("package.json");

  // .env.example lists the names the deploy script sets (it reads this file to find the owner sign-in names).
  const envPath = path.join(appDir, ".env.example");
  const have = (await exists(envPath)) ? await readFile(envPath, "utf8") : "";
  const wanted = ["DATABASE_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD_HASH", "SESSION_SECRET", "NEXT_PUBLIC_SITE_URL", "RESEND_API_KEY", "EMAIL_FROM"];
  const missing = wanted.filter((k) => !new RegExp(`^${k}=`, "m").test(have));
  if (missing.length) await writeFile(envPath, have + (have && !have.endsWith("\n") ? "\n" : "") + missing.map((k) => `${k}=`).join("\n") + "\n");
  files.push(".env.example");
  return { files };
}
