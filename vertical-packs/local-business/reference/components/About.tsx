import type { Content } from "../lib/content";

/** AboutSplit01: the owner's own words, one or two columns. No picture means one column, never a grey box or an invented slogan. */
export function About({ c }: { c: Content }) {
  if (!c.about?.body) return null;
  const pic = c.usePhotos && c.aboutImage?.src ? c.aboutImage : undefined;
  const paras = c.about.body.split(/\n+/).filter(Boolean);
  return (
    <section className="rb-sec" id="about">
      <div className="rb-container">
        <div className={pic ? "rb-about" : "rb-about solo"}>
          <div>
            <h2>{c.about.heading || "About us"}</h2>
            {paras.map((p, n) => <p key={n}>{p}</p>)}
          </div>
          {pic ? <img src={pic.src} alt={pic.alt} loading="lazy" /> : null}
        </div>
      </div>
    </section>
  );
}
