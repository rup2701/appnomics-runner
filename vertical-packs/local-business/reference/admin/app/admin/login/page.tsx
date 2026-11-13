import { notFound, redirect } from "next/navigation";
import { isAdmin } from "../../../lib/admin-session";
import { dbConfigured } from "../../../lib/db";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  bad: "That email or password is not right.",
  many: "Too many tries. Wait a few minutes and try again.",
  origin: "Please sign in from this page.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (!dbConfigured()) notFound();
  if (await isAdmin()) redirect("/admin/menu");
  const { e } = await searchParams;
  return (
    <form className="ad-card ad-login" action="/api/admin/login" method="post">
      <h1>Sign in</h1>
      {e && MESSAGES[e] ? <p className="ad-error" role="alert">{MESSAGES[e]}</p> : null}
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      <button type="submit" className="ad-btn">Sign in</button>
    </form>
  );
}
