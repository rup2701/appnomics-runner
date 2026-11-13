import type { ReactNode } from "react";
import { isAdmin } from "../../lib/admin-session";
import { dbConfigured } from "../../lib/db";
import "../../styles/admin.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Owner area", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const signedIn = dbConfigured() && (await isAdmin());
  return (
    <div className="ad">
      <header className="ad-bar">
        <strong>Owner area</strong>
        {signedIn ? (
          <nav className="ad-nav" aria-label="Owner area">
            <a href="/admin/menu">Menu</a>
            <a href="/admin/requests">Table requests</a>
            <a href="/" target="_blank" rel="noopener noreferrer">View site</a>
            <form action="/api/admin/logout" method="post"><button type="submit" className="ad-link">Sign out</button></form>
          </nav>
        ) : null}
      </header>
      <main className="ad-main">{children}</main>
    </div>
  );
}
