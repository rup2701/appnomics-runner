import type { Content } from "../lib/content";

/** Story01: the owner's story as a page of its own. Their words in their order, one picture when allowed, nothing added. */
export function Story({ c }: { c: Content }) {
  if (!c.story?.body?.trim()) return null;
  const pic = c.usePhotos && c.story.image?.src ? c.story.image : undefined;
  const paras = c.story.body.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  return (
    <section className="rb-sec" id="story">
      <div className="rb-container rb-story">
        <h1 className="rb-title">{c.story.heading || "Our story"}</h1>
        {pic ? <img className="rb-story-pic" src={pic.src} alt={pic.alt} loading="lazy" /> : null}
        {paras.map((p, n) => <p key={n}>{p}</p>)}
      </div>
    </section>
  );
}
