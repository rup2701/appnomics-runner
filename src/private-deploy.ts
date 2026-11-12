// Protection for a private test deploy. Kept apart from deploy.ts so tests can import it without starting a deploy.

/**
 * Switches protection on for a Vercel project and reads it back. The project must exist (vercel link creates it) and nothing may be deployed yet.
 * PRIVATE_PROTECTION=password with PRIVATE_SITE_PASSWORD set (8 to 72 characters) uses a shared password; otherwise Vercel Authentication (team members only).
 * Either covers every deployment, custom domains included. Throws unless the settings read back as on, so a failure here means nothing is deployed.
 */
export async function protectProject(name: string, env: NodeJS.ProcessEnv = process.env, fetcher: typeof fetch = fetch): Promise<"password" | "vercel-login"> {
  const scope = env.VERCEL_SCOPE ? `?slug=${encodeURIComponent(env.VERCEL_SCOPE)}` : "";
  const url = `https://api.vercel.com/v9/projects/${encodeURIComponent(name)}${scope}`;
  const headers = { Authorization: `Bearer ${env.VERCEL_TOKEN}`, "Content-Type": "application/json" };
  const usePassword = env.PRIVATE_PROTECTION === "password";
  if (usePassword && !(env.PRIVATE_SITE_PASSWORD && env.PRIVATE_SITE_PASSWORD.length >= 8 && env.PRIVATE_SITE_PASSWORD.length <= 72)) {
    throw new Error("PRIVATE_PROTECTION=password needs PRIVATE_SITE_PASSWORD (8 to 72 characters) in the runner's environment. Nothing was deployed.");
  }
  const body = usePassword
    ? { passwordProtection: { deploymentType: "all", password: env.PRIVATE_SITE_PASSWORD }, ssoProtection: null }
    : { ssoProtection: { deploymentType: "all" } };
  const patched = await fetcher(url, { method: "PATCH", headers, body: JSON.stringify(body) });
  if (!patched.ok) throw new Error(`Could not switch protection on for "${name}" (HTTP ${patched.status}). Nothing was deployed. Remove the empty project with: vercel project rm ${name}`);
  const got = await fetcher(url, { headers });
  const p = (await got.json().catch(() => ({}))) as { ssoProtection?: { deploymentType?: string } | null; passwordProtection?: { deploymentType?: string } | null };
  const on = usePassword ? p.passwordProtection?.deploymentType === "all" : p.ssoProtection?.deploymentType === "all";
  if (!on) throw new Error(`Protection did not read back as on for "${name}". Nothing was deployed. Remove the empty project with: vercel project rm ${name}`);
  return usePassword ? "password" : "vercel-login";
}

/** A protected site answers a visitor who is not signed in with a refusal or a redirect to a login, never with the page. */
export async function checkProtected(siteUrl: string, fetcher: typeof fetch = fetch): Promise<{ status: number; protectedOk: boolean }> {
  for (let i = 0; i < 12; i++) {
    try {
      const r = await fetcher(siteUrl, { redirect: "manual" });
      if (r.status !== 404) return { status: r.status, protectedOk: r.status === 401 || r.status === 403 || (r.status >= 300 && r.status < 400) };
    } catch { /* the address may not be live yet */ }
    await new Promise((res) => setTimeout(res, 5000));
  }
  return { status: 0, protectedOk: false };
}

