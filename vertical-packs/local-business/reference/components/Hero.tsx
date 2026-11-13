import { menuHref, requestEndpoint, reserveMode, safeHref, telHref, type Content } from "../lib/content";
import { ReserveForm } from "./ReserveForm";

/** HeroRestaurant01 + ReserveRow01. The name is always the h1, in white on the picture. The request form is one white pill under it. Buttons only exist when they go somewhere real. */
export function Hero({ c }: { c: Content }) {
  const photo = c.usePhotos && c.heroImage?.src ? c.heroImage.src : undefined;
  const scrim = "linear-gradient(rgba(0,0,0,0.48), rgba(0,0,0,0.48))";
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
          {r.mode === "request" ? <div id="reserve"><ReserveForm endpoint={requestEndpoint(c)!} phone={c.contact.phone} variant="hero" /></div> : null}
          <div className="rb-actions">
            {r.href && r.mode !== "request" ? <a className="rb-btn" href={r.href} {...(r.mode === "link" ? ext : {})}>{r.label}</a> : null}
            {order ? <a className={r.href && r.mode !== "request" ? "rb-btn ghost" : "rb-btn ghost"} href={order} {...ext}>Order online</a> : null}
            {!r.href && !order && menuHref(c) ? <a className="rb-btn" href={menuHref(c)}>View menu</a> : null}
            {(r.mode === "link" || r.mode === "request") && call ? <a className="rb-btn ghost" href={call}>Call us</a> : null}
          </div>
          {c.contact.hours[0] ? <p className="rb-hours-line">{c.contact.hours[0]}</p> : null}
        </div>
      </div>
    </section>
  );
}
