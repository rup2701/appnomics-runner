import { ComingSoon } from "./ComingSoon";
import { safeHref, telHref, type Content } from "../lib/content";

/** FeatureBand01: the owner's catering words and up to four short cards, with one button to the catering page or phone. */
export function Catering({ c }: { c: Content }) {
  if (!c.catering) return c.scaffold ? <ComingSoon id="catering" title="Catering" text="Catering details are coming soon." alt /> : null;
  const href = safeHref(c.links.catering) ?? telHref(c.contact.phone);
  const external = href?.startsWith("https://");
  return (
    <section className="rb-sec alt" id="catering">
      <div className="rb-container">
        <div className="rb-band">
          <h2>{c.catering.heading}</h2>
          {c.catering.body ? <p className="lead">{c.catering.body}</p> : null}
          {c.catering.features.length ? (
            <div className="rb-feats">
              {c.catering.features.slice(0, 4).map((f) => (
                <div className="rb-feat" key={f.title}><h3>{f.title}</h3><p>{f.body}</p></div>
              ))}
            </div>
          ) : null}
          {href ? <a className="rb-btn" href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{href.startsWith("tel:") ? "Call about catering" : "Ask about catering"}</a> : null}
        </div>
      </div>
    </section>
  );
}
