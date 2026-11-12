import { reserveMode, safeHref, telHref, type Content } from "../lib/content";
import { Footer } from "./Footer";
import { Nav } from "./Nav";
import { PageBehaviour } from "./PageBehaviour";

/**
 * The frame every page shares: top bar, footer and the page script. The slim bar (Reserve, Order online, Call us) belongs to the home page,
 * where it slides in once the hero has scrolled away; the other pages already have the top bar's button in view.
 */
export function Shell({ c, year = new Date().getFullYear(), slimBar = false, children }: { c: Content; year?: number; slimBar?: boolean; children: React.ReactNode }) {
  const r = reserveMode(c);
  const order = safeHref(c.links.order) ?? safeHref(c.links.delivery[0]?.url);
  const call = r.mode === "link" ? telHref(c.contact.phone) : undefined;
  const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
  return (
    <div className="rb" style={{ ["--accent" as string]: c.accent }}>
      <Nav c={c} />
      {slimBar && (r.href || order) ? (
        <div className="rb-sticky" id="rb-sticky">
          <div className="rb-container rb-sticky-in">
            <strong>{c.name}</strong>
            <div className="rb-sticky-actions">
              {r.href ? <a className="rb-btn" href={r.href} {...(r.mode === "link" ? ext : {})}>{r.label}</a> : null}
              {order ? <a className={r.href ? "rb-btn ghost" : "rb-btn"} href={order} {...ext}>Order online</a> : null}
              {call ? <a className="rb-btn ghost" href={call}>Call us</a> : null}
            </div>
          </div>
        </div>
      ) : null}
      {children}
      <Footer c={c} year={year} />
      <PageBehaviour />
    </div>
  );
}
