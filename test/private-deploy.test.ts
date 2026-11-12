import assert from "node:assert/strict";
import { checkProtected, protectProject } from "../src/private-deploy.js";

let failed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log("PASS", name); } catch (e) { failed++; console.log("FAIL", name, e); }
}
type Call = { url: string; method: string; body: unknown };
// A stand-in for Vercel: remembers what was patched and answers the read-back from it.
function fakeVercel(opts: { patchStatus?: number; readBackOn?: boolean } = {}) {
  const calls: Call[] = [];
  let saved: Record<string, unknown> = {};
  const f = (async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, method, body });
    if (method === "PATCH") {
      if ((opts.patchStatus ?? 200) !== 200) return new Response("{}", { status: opts.patchStatus });
      saved = { ...saved, ...body };
      return new Response("{}", { status: 200 });
    }
    return new Response(JSON.stringify(opts.readBackOn === false ? {} : saved), { status: 200 });
  }) as typeof fetch;
  return { f, calls };
}
const env = { VERCEL_TOKEN: "tok", VERCEL_SCOPE: "team" } as NodeJS.ProcessEnv;

await test("by default Vercel Authentication is switched on for every deployment and read back", async () => {
  const v = fakeVercel();
  assert.equal(await protectProject("private-x", env, v.f), "vercel-login");
  assert.deepEqual(v.calls[0].body, { ssoProtection: { deploymentType: "all" } });
  assert.match(v.calls[0].url, /projects\/private-x\?slug=team$/);
  assert.equal(v.calls[1].method, "GET");
});

await test("password protection covers every deployment and turns the login option off", async () => {
  const v = fakeVercel();
  const r = await protectProject("private-x", { ...env, PRIVATE_PROTECTION: "password", PRIVATE_SITE_PASSWORD: "correct horse 99" }, v.f);
  assert.equal(r, "password");
  assert.deepEqual(v.calls[0].body, { passwordProtection: { deploymentType: "all", password: "correct horse 99" }, ssoProtection: null });
});

await test("a missing or short password stops before anything is sent", async () => {
  const v = fakeVercel();
  await assert.rejects(() => protectProject("private-x", { ...env, PRIVATE_PROTECTION: "password" }, v.f), /PRIVATE_SITE_PASSWORD/);
  await assert.rejects(() => protectProject("private-x", { ...env, PRIVATE_PROTECTION: "password", PRIVATE_SITE_PASSWORD: "short" }, v.f), /PRIVATE_SITE_PASSWORD/);
  assert.equal(v.calls.length, 0);
});

await test("a refused update stops, with the clean-up command", async () => {
  await assert.rejects(() => protectProject("private-x", env, fakeVercel({ patchStatus: 403 }).f), /Nothing was deployed.*vercel project rm private-x/);
});

await test("protection that does not read back as on stops", async () => {
  await assert.rejects(() => protectProject("private-x", env, fakeVercel({ readBackOn: false }).f), /did not read back/);
});

await test("a visitor who is not signed in must be refused or sent to a login", async () => {
  const mk = (status: number) => (async () => new Response("", { status })) as unknown as typeof fetch;
  assert.deepEqual(await checkProtected("https://x", mk(401)), { status: 401, protectedOk: true });
  assert.deepEqual(await checkProtected("https://x", mk(307)), { status: 307, protectedOk: true });
  assert.deepEqual(await checkProtected("https://x", mk(200)), { status: 200, protectedOk: false });
});

if (failed) { console.log(`${failed} FAILED`); process.exit(1); }
console.log("all passed");
