import { highlightCards, priceText, type Content } from "../lib/content";

/** MenuHighlights01: up to six dish cards. A picture strip appears only for a dish with a real, allowed picture. */
export function MenuHighlights({ c }: { c: Content }) {
  const items = highlightCards(c);
  return (
    <section className="rb-sec alt" id="highlights">
      <div className="rb-container">
        <h2 className="rb-title">From the menu</h2>
        <div className={items.length === 4 ? "rb-grid two" : "rb-grid"}>
          {items.map((i) => {
            const price = priceText(i, c.menu.showPrices);
            return (
              <article className="rb-dish" key={i.name}>
                {i.image ? <img src={i.image.src} alt={i.image.alt} loading="lazy" /> : c.scaffold ? <div className="rb-dish-ph" aria-hidden="true" /> : null}
                <div className="rb-dish-body">
                  <div className="rb-dish-head">
                    <h3>{i.name}</h3>
                    {price ? <span className="rb-price">{price}</span> : null}
                  </div>
                  {i.description ? <p>{i.description}</p> : null}
                  {i.placeholder ? <p className="rb-soon-line">Coming soon</p> : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
