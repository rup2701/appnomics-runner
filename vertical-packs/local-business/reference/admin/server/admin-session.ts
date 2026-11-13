import { cookies, headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { checkSession, COOKIE, sameOrigin } from "./auth";
import { dbConfigured } from "./db";

/** Is the person signed in as the owner? Reads the cookie; no database needed. */
export async function isAdmin(): Promise<boolean> {
  const v = (await cookies()).get(COOKIE)?.value;
  return checkSession(v, process.env.ADMIN_EMAIL, process.env.SESSION_SECRET);
}

/** For admin pages. Without a database there is no owner area at all (404). Not signed in goes to the sign-in page. */
export async function requireAdmin(): Promise<void> {
  if (!dbConfigured()) notFound();
  if (!(await isAdmin())) redirect("/admin/login");
}

/** For admin API routes: signed in, and a post that comes from this site's own pages. Returns a response to send when it fails. */
export async function adminApiGuard(req: Request, opts: { write: boolean }): Promise<Response | null> {
  if (!dbConfigured()) return Response.json({ error: "Not found." }, { status: 404 });
  if (!(await isAdmin())) return Response.json({ error: "Sign in first." }, { status: 401 });
  if (opts.write) {
    const h = await headers();
    if (!sameOrigin(h.get("origin"), h.get("host"))) return Response.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  return null;
}
