import { priceText, type Content } from "../lib/content";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** FullMenu01: every category and dish exactly as the owner's site lists them. Category chips jump down the page. Prices follow the switch. */
export function FullMenu({ c }: { c: Content }) {
  const cats = c.menu.categories.filter((k) => k.items.length > 0);
  return (
    <section className="rb-sec" id="menu">
      <div className="rb-container">
        <h2 className="rb-title">Menu</h2>
        {cats.length > 1 ? (
          <nav className="rb-menu-tabs" aria-label="Menu categories">
            {cats.map((k) => <a key={k.name} href={`#menu-${slug(k.name)}`}>{k.name}</a>)}
          </nav>
        ) : null}
        {cats.map((k) => (
          <div className="rb-cat" id={`menu-${slug(k.name)}`} key={k.name}>
            <h3>{k.name}</h3>
            <ul>
              {k.items.map((i, n) => {
                const price = priceText(i, c.menu.showPrices);
                return (
                  <li key={`${i.name}-${n}`}>
                    <span className="n">{i.name}{i.description ? <span className="d">{i.description}</span> : null}</span>
                    {price ? <span className="p">{price}</span> : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
