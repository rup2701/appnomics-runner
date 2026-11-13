import { ComingSoon } from "./ComingSoon";
import { firstParagraph, hasStory, type Content } from "../lib/content";

/**
 * AboutSplit01: the owner's own words, one or two columns. No picture means one column, never a grey box or an invented slogan.
 * When the site has a story page, this is the short version: the first paragraph as written, and a link to the rest.
 */
export function About({ c }: { c: Content }) {
  const story = hasStory(c);
  const body = story ? c.story?.body?.trim() : c.about?.body?.trim();
  if (!body) return c.scaffold ? <ComingSoon id="about" title="Our story" text="Our story is coming soon." /> : null;
  const pic = c.usePhotos ? (c.aboutImage?.src ? c.aboutImage : c.story?.image?.src ? c.story.image : undefined) : undefined;
  const paras = story ? [firstParagraph(body)] : body.split(/\n+/).filter(Boolean);
  return (
    <section className="rb-sec" id="about">
      <div className="rb-container">
        <div className={pic ? "rb-about" : "rb-about solo"}>
          <div>
            <h2>{story ? c.story?.heading || "Our story" : c.about?.heading || "About us"}</h2>
            {paras.map((p, n) => <p key={n}>{p}</p>)}
            {story ? <p><a className="rb-btn ghost" href="/story">Read our story</a></p> : null}
          </div>
          {pic ? <img src={pic.src} alt={pic.alt} loading="lazy" /> : null}
        </div>
      </div>
    </section>
  );
}
