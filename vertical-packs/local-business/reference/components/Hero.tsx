import { reserveMode, safeHref, telHref, type Content } from "../lib/content";

/** HeroRestaurant01 + ReserveRow01. The name is always the h1. Buttons only exist when they go somewhere real. */
export function Hero({ c }: { c: Content }) {
  const photo = c.usePhotos && c.heroImage?.src ? c.heroImage.src : undefined;
  const scrim = "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5))";
  const field = "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 40%, #1f1f1f))";
  const style = { backgroundImage: photo ? `${scrim}, url("${photo}")` : `${scrim}, ${field}` };
  const r = reserveMode(c);
  const order = safeHref(c.links.order) ?? safeHref(c.links.delivery[0]?.url);
  const call = telHref(c.contact.phone);
  const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
  return (
    <section className="rb-hero" id="top" style={style}>
      <div className="rb-container" style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <div className="rb-hero-card">
          {c.kind ? <p className="kind">{c.kind}</p> : null}
          <h1>{c.name}</h1>
          {c.tagline ? <p className="lead">{c.tagline}</p> : null}
          <div className="rb-actions">
            {r.href ? <a className="rb-btn" href={r.href} {...(r.mode === "link" ? ext : {})}>{r.label}</a> : null}
            {order ? <a className={r.href ? "rb-btn ghost" : "rb-btn"} href={order} {...ext}>Order online</a> : null}
            {!r.href && !order && c.menu.categories.length ? <a className="rb-btn" href="#menu">View menu</a> : null}
            {r.mode === "link" && call ? <a className="rb-btn ghost" href={call}>Call us</a> : null}
          </div>
          {c.contact.hours[0] ? <p className="rb-hours-line">{c.contact.hours[0]}</p> : null}
        </div>
      </div>
    </section>
  );
}
