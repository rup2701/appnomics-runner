import { navLinks, reserveMode, type Content } from "../lib/content";

/** NavRestaurant01: fixed bar, name at left, links from the sections that exist, one accent button (reserve or call). */
export function Nav({ c }: { c: Content }) {
  const r = reserveMode(c);
  return (
    <nav className="rb-nav" id="rb-nav">
      <div className="rb-container rb-nav-in">
        <a href="#top" className="rb-logo">{c.name}</a>
        <ul className="rb-links">
          {navLinks(c).map((l) => (
            <li key={l.href}><a href={l.href}>{l.label}</a></li>
          ))}
        </ul>
        {r.href ? <a className="rb-btn" href={r.href} {...(r.mode === "link" ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{r.label}</a> : null}
      </div>
    </nav>
  );
}
