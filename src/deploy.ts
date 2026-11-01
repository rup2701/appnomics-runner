// Usage:
//   npm run deploy -- runs/<run-folder> --name ksandra --email owner@example.com [--password "..."]
//   (a first deploy refuses to run if a Vercel project with that name already exists)
//   npm run deploy -- runs/<run-folder> --set-password "a new password" [--email owner@example.com]   (owner password on a deployed site)
//   npm run deploy -- runs/<run-folder> --redeploy [--skip-migrate]   (code or migration changes to a site already deployed)
// Needs VERCEL_TOKEN and NEON_API_KEY in the runner's environment (never in the app folder).
// Optional: VERCEL_SCOPE (team slug), NEON_ORG_ID, APP_DOMAIN (default appnomics.live), NEON_POOLED=0.
// The app's own commands (migrate, seed, hash) run with a clean environment: no tokens.
import { spawn } from "node:child_process";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

const secrets: string[] = [];
const redact = (s: string) => secrets.reduce((t, v) => (v ? t.split(v).join("***") : t), s);
const log = (s: string) => console.log(redact(s));

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

function baseEnv(extra: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = { CI: "1" };
  for (const k of ["PATH", "HOME", "USER", "LANG", "TMPDIR", "NODE_PATH"]) if (process.env[k]) env[k] = process.env[k]!;
  return { ...env, ...extra };
}

function sh(cmd: string, args: string[], opts: { cwd: string; env: Record<string, string>; input?: string; timeoutMs?: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, env: opts.env });
    let out = "", err = "";
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error(`${cmd} ${args[0]} timed out`)); }, opts.timeoutMs ?? 600_000);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else {
        const clean = (t: string) => t.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "").split(/\r|\n/).map((l) => l.trim()).filter(Boolean);
        const lines = [...clean(out), ...clean(err)].filter((l) => !/^\[?[⣾⣽⣻⢿⡿⣟⣯⣷]/.test(l)).slice(-30);
        reject(new Error(redact(`${cmd} ${args.slice(0, 3).join(" ")} failed (exit ${code}):\n${lines.join("\n")}`)));
      }
    });
    if (opts.input !== undefined) child.stdin.end(opts.input); else child.stdin.end();
  });
}

const pooled = (uri: string) => (process.env.NEON_POOLED === "0" ? uri : uri.replace(/@([^.@/]+?)(-pooler)?\./, "@$1-pooler."));
const direct = (uri: string) => uri.replace("-pooler.", ".");

async function neonDirectUrl(state: { neonProjectId: string; neonDatabase?: string; neonRole?: string }): Promise<string> {
  if (!process.env.NEON_API_KEY) throw new Error("Set NEON_API_KEY (source ~/.appnomics/keys.env)");
  const q = new URLSearchParams({ database_name: state.neonDatabase ?? "neondb", role_name: state.neonRole ?? "neondb_owner" });
  const res = await fetch(`https://console.neon.tech/api/v2/projects/${state.neonProjectId}/connection_uri?${q}`, {
    headers: { Authorization: `Bearer ${process.env.NEON_API_KEY}`, Accept: "application/json" },
  });
  const body = (await res.json()) as { uri?: string; message?: string };
  if (!res.ok || !body.uri) throw new Error(`Neon did not return the database address (${res.status}): ${body.message ?? "no address"}`);
  return direct(body.uri);
}

async function hasMigrations(appDir: string) {
  try { return (await readdir(path.join(appDir, "drizzle"))).some((f) => f.endsWith(".sql")); } catch { return false; }
}

async function migrate(appDir: string, directUrl: string, firstTime: boolean) {
  const env = baseEnv({ DATABASE_URL: directUrl });
  if (await hasMigrations(appDir)) {
    log("  applying migrations (db:migrate)");
    await sh("npm", ["run", "db:migrate"], { cwd: appDir, env });
  } else if (firstTime) {
    log("  no migration files; this is a new empty database, so using drizzle-kit push");
    await sh("npx", ["drizzle-kit", "push", "--force"], { cwd: appDir, env });
  } else {
    throw new Error("No migration files and the database is not new: refusing to run push on a live database.");
  }
}

async function seed(appDir: string, directUrl: string) {
  let needsConfirm = false;
  try { needsConfirm = (await readFile(path.join(appDir, "src/db/seed.ts"), "utf8")).includes("--confirm"); } catch { /* no seed file */ }
  const args = ["run", "db:seed", ...(needsConfirm ? ["--", "--confirm"] : [])];
  log(`  seeding (npm ${args.join(" ")})`);
  await sh("npm", args, { cwd: appDir, env: baseEnv({ DATABASE_URL: directUrl }) }); // never db:reset
}

/** The owner sign-in variables are named differently by different builds (ADMIN_* or OWNER_*). Use what the app's .env.example asks for. */
async function ownerVarNames(appDir: string): Promise<{ email: string; hash: string }> {
  let keys: string[] = [];
  try { keys = [...(await readFile(path.join(appDir, ".env.example"), "utf8")).matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]); } catch { /* no .env.example */ }
  return {
    email: keys.find((k) => /^(ADMIN|OWNER)_EMAIL$/.test(k)) ?? "ADMIN_EMAIL",
    hash: keys.find((k) => /^(ADMIN|OWNER)_PASSWORD_HASH$/.test(k)) ?? "ADMIN_PASSWORD_HASH",
  };
}

async function hashPassword(appDir: string, password: string): Promise<string> {
  // npm --silent hides its own "Missing script" message, so look for the script first and name the problem.
  // The agent has called it "hash-password" (the pack asks for this name) and once "hash"; accept both.
  const scripts = (JSON.parse(await readFile(path.join(appDir, "package.json"), "utf8")).scripts ?? {}) as Record<string, string>;
  const script = ["hash-password", "hash"].find((n) => typeof scripts[n] === "string");
  if (!script) throw new Error('This app has no "hash-password" script in package.json, so the owner password cannot be hashed. Nothing was deployed. Add "hash-password": "tsx scripts/hash-password.ts" (the script must print scrypt:<salt>:<hash>) and run again.');
  const out = await sh("npm", ["run", "--silent", script, "--", password], { cwd: appDir, env: baseEnv() });
  // The pack asks for scrypt:<salt>:<hash>. One build used bcrypt ($2b$10$...), and its sign-in checks bcrypt, so accept both.
  const m = out.match(/scrypt:[0-9a-f]+:[0-9a-f]+|\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/);
  if (!m) throw new Error("The hash script printed no recognised hash (scrypt:<salt>:<hash> or bcrypt). Check scripts/hash-password.ts.");
  return m[0];
}

// Vercel (or Next at startup) expands $NAME inside environment values, which empties a bcrypt hash ($2b$10$...).
// A backslash keeps each $ literal. A scrypt hash has no $, so it passes through unchanged.
const forVercel = (hash: string) => hash.replace(/\$/g, "\\$");

const vercelEnv = () => baseEnv({ VERCEL_TOKEN: process.env.VERCEL_TOKEN! });
const scope = () => (process.env.VERCEL_SCOPE ? ["--scope", process.env.VERCEL_SCOPE] : []);

async function vercel(appDir: string, args: string[], input?: string) {
  return sh("npx", ["--yes", "vercel@latest", ...args, ...scope()], { cwd: appDir, env: vercelEnv(), input });
}

async function deployProd(appDir: string): Promise<string> {
  const out = await vercel(appDir, ["deploy", "--prod", "--yes"]);
  const url = out.trim().split("\n").filter((l) => l.startsWith("https://")).pop();
  if (!url) throw new Error("Vercel did not print a deployment address.");
  return url;
}

async function verify(siteUrl: string): Promise<{ home: number; signIn: number; adminRedirects: boolean }> {
  const get = async (p: string, manual = false) => fetch(siteUrl + p, { redirect: manual ? "manual" : "follow" });
  for (let i = 0; i < 12; i++) {
    try {
      const home = await get("/");
      const signIn = await get("/admin/sign-in");
      const admin = await get("/admin", true);
      const adminRedirects = admin.status >= 300 && admin.status < 400 && (admin.headers.get("location") ?? "").includes("sign-in");
      if (home.status === 200) return { home: home.status, signIn: signIn.status, adminRedirects };
    } catch { /* domain may not be live yet */ }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return { home: 0, signIn: 0, adminRedirects: false };
}

async function main() {
  const runDir = process.argv[2];
  if (!runDir || runDir.startsWith("--")) throw new Error("Usage: npm run deploy -- runs/<run-folder> --name <site> --email <owner email> [--password ...] | --redeploy");
  if (!process.env.VERCEL_TOKEN) throw new Error("Set VERCEL_TOKEN (source ~/.appnomics/keys.env)");
  secrets.push(process.env.VERCEL_TOKEN, process.env.NEON_API_KEY ?? "", process.env.ANTHROPIC_API_KEY ?? "");
  const root = path.resolve(runDir);
  const appDir = path.join(root, "app");
  const statePath = path.join(root, "deploy.json");
  const domainBase = process.env.APP_DOMAIN ?? "appnomics.live";

  // ---- set a new owner password on a deployed site ----
  if (arg("set-password") !== undefined) {
    const state = JSON.parse(await readFile(statePath, "utf8"));
    const pw = arg("set-password")!;
    if (pw.length < 10) throw new Error("--set-password needs at least 10 characters");
    secrets.push(pw);
    const hash = await hashPassword(appDir, pw);
    secrets.push(hash);
    log(`Setting a new owner password on ${state.host}`);
    const names = await ownerVarNames(appDir);
    await vercel(appDir, ["env", "add", names.hash, "production", "--force"], forVercel(hash));
    // --email also (re)sets the owner email, for a site deployed before the variable names were detected.
    if (arg("email")) await vercel(appDir, ["env", "add", names.email, "production", "--force"], arg("email")!);
    const deployUrl = await deployProd(appDir);
    const result = await verify(`https://${state.host}`);
    await writeFile(statePath, JSON.stringify({ ...state, deployUrl, passwordSetAt: new Date().toISOString() }, null, 2));
    log(`\nDone. Sign in at https://${state.host}/admin/sign-in\n${JSON.stringify(result)}`);
    return;
  }

  // ---- redeploy: same site, new code or new migrations ----
  if (flag("redeploy")) {
    const state = JSON.parse(await readFile(statePath, "utf8"));
    log(`Redeploying ${state.host}`);
    if (flag("skip-migrate")) log("  skipping migrations (--skip-migrate)");
    else {
      const url = await neonDirectUrl(state);
      secrets.push(url);
      await migrate(appDir, url, false);
    }
    const deployUrl = await deployProd(appDir);
    const result = await verify(`https://${state.host}`);
    await writeFile(statePath, JSON.stringify({ ...state, deployUrl, redeployedAt: new Date().toISOString() }, null, 2));
    log(`\nDone: https://${state.host}\n${JSON.stringify(result)}`);
    return;
  }

  // ---- first deploy ----
  if (!process.env.NEON_API_KEY) throw new Error("Set NEON_API_KEY (source ~/.appnomics/keys.env)");
  const name = arg("name") ?? "";
  const email = arg("email") ?? "";
  if (!/^[a-z0-9-]{3,40}$/.test(name)) throw new Error("--name must be 3 to 40 lowercase letters, numbers or dashes (it becomes name." + domainBase + ")");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("--email must be the owner's email address");
  const already = await readFile(statePath).then(() => true, () => false);
  if (already) throw new Error(`${statePath} exists: this site was deployed already. Use --redeploy.`);

  // `vercel link --project <name>` attaches to an existing project with that name, and the steps after it
  // overwrite its production settings and deploy over it. A first deploy must only ever create a new project.
  const scopeQuery = process.env.VERCEL_SCOPE ? `?slug=${encodeURIComponent(process.env.VERCEL_SCOPE)}` : "";
  const exists = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(name)}${scopeQuery}`, {
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
  });
  if (exists.status === 200) throw new Error(`A Vercel project named "${name}" already exists in this account. Nothing was changed. Pick another --name; this script only creates new projects and never reuses one.`);
  if (exists.status !== 404) throw new Error(`Could not check whether the Vercel project "${name}" exists (HTTP ${exists.status}). Nothing was changed. Check VERCEL_TOKEN and VERCEL_SCOPE and try again.`);

  const generated = !arg("password") && !process.env.ADMIN_PASSWORD;
  const password = arg("password") ?? process.env.ADMIN_PASSWORD ?? randomBytes(12).toString("base64url");
  secrets.push(password);
  const host = `${name}.${domainBase}`;
  const siteUrl = `https://${host}`;
  log(`Deploying ${root} to ${siteUrl}`);

  log("1/7 Creating the database on Neon");
  const res = await fetch("https://console.neon.tech/api/v2/projects", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.NEON_API_KEY}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ project: { name: `appnomics-${name}`, ...(process.env.NEON_ORG_ID ? { org_id: process.env.NEON_ORG_ID } : {}) } }),
  });
  const neon = (await res.json()) as { project?: { id: string }; connection_uris?: { connection_uri: string; connection_parameters?: { database?: string; role?: string } }[]; message?: string };
  const neonParams = neon.connection_uris?.[0]?.connection_parameters;
  const uri = neon.connection_uris?.[0]?.connection_uri;
  if (!res.ok || !uri || !neon.project) throw new Error(`Neon did not create the project (${res.status}): ${neon.message ?? "no connection address returned"}`);
  secrets.push(uri, direct(uri), pooled(uri));
  log(`  project ${neon.project.id}`);

  try {
    log("2/7 Creating tables and sample content");
    await migrate(appDir, direct(uri), true);
    await seed(appDir, direct(uri));

    log("3/7 Hashing the owner password");
    const hash = await hashPassword(appDir, password);
    secrets.push(hash);

    log("4/7 Linking the Vercel project");
    await writeFile(path.join(appDir, "vercel.json"), JSON.stringify({ framework: "nextjs" }, null, 2));
    await vercel(appDir, ["link", "--yes", "--project", name]);

    log("5/7 Setting production settings");
    const names = await ownerVarNames(appDir);
    const vars: Record<string, string> = {
      DATABASE_URL: pooled(uri),
      [names.email]: email,
      [names.hash]: forVercel(hash),
      SESSION_SECRET: randomBytes(32).toString("hex"),
      NEXT_PUBLIC_SITE_URL: siteUrl,
    };
    for (const [k, v] of Object.entries(vars)) await vercel(appDir, ["env", "add", k, "production", "--force"], v);
    try {
      const example = await readFile(path.join(appDir, ".env.example"), "utf8");
      const wanted = [...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]);
      const missing = wanted.filter((k) => !(k in vars) && !["BLOB_READ_WRITE_TOKEN", "FAULT_INJECTION"].includes(k));
      if (missing.length) log(`  NOTE: .env.example also lists ${missing.join(", ")}; not set by this script.`);
    } catch { /* no .env.example */ }

    log("6/7 Deploying to production (the build runs on Vercel; this takes a few minutes)");
    const deployUrl = await deployProd(appDir);

    log("7/7 Adding the address and checking the site");
    try { await vercel(appDir, ["domains", "add", host, name]); }
    catch { await vercel(appDir, ["alias", "set", deployUrl, host]); }
    const result = await verify(siteUrl);

    await writeFile(statePath, JSON.stringify({ name, host, neonProjectId: neon.project.id, neonDatabase: neonParams?.database, neonRole: neonParams?.role, deployUrl, deployedAt: new Date().toISOString() }, null, 2));
    log(`\nLive: ${siteUrl}\nChecks: home ${result.home}, sign-in page ${result.signIn}, /admin sends visitors to sign-in: ${result.adminRedirects}`);
    console.log(`Owner sign-in: ${email}${generated ? `\nGenerated password (shown once, save it): ${password}` : " (the password you gave)"}`); // printed raw on purpose
    log("Sample signups were seeded and are labelled as samples; delete them in the owner area before real use.");
    log("Image uploads need a Blob store: add one in the Vercel dashboard (Storage, Public), connect it to this project, then redeploy.");
  } catch (e) {
    log(`\nFAILED after creating Neon project ${neon.project.id}. Delete it in the Neon console if you do not retry.`);
    throw e;
  }
}

main().catch((e) => { console.error(redact(e instanceof Error ? e.message : String(e))); process.exit(1); });
