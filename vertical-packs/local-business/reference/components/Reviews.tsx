import { ComingSoon } from "./ComingSoon";
import { stars, type Content } from "../lib/content";

/** ReviewsCards01: the owner's testimonials, word for word. Stars only for a rating the page itself showed. */
export function Reviews({ c }: { c: Content }) {
  const list = c.testimonials.filter((t) => t.quote.trim()).slice(0, 6);
  if (!list.length) return c.scaffold ? <ComingSoon id="reviews" title="What people are saying" text="Reviews are coming soon." /> : null;
  return (
    <section className="rb-sec" id="reviews">
      <div className="rb-container">
        <h2 className="rb-title">What people are saying</h2>
        <div className="rb-grid">
          {list.map((t, n) => {
            const s = stars(t);
            return (
              <div className="rb-review" key={n}>
                <blockquote>{t.quote}</blockquote>
                {t.author || t.source || s ? (
                  <footer>
                    <span>{t.author}</span>
                    <span className="src">
                      {s ? <span className="rb-stars" aria-label={`${s} out of 5 stars`}>{"★".repeat(s)}</span> : null}
                      {t.source ? <span>{t.source}</span> : null}
                    </span>
                  </footer>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
