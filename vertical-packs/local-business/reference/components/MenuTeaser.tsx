import { ComingSoon } from "./ComingSoon";
import { slug, type Content } from "../lib/content";

/** MenuTeaser01: on the home page the menu is a short section. Category chips jump into the menu page, and one button opens all of it. */
export function MenuTeaser({ c }: { c: Content }) {
  const cats = c.menu.categories.filter((k) => k.items.length > 0);
  const dishes = cats.reduce((n, k) => n + k.items.length, 0);
  if (!dishes) return c.scaffold ? <ComingSoon id="menu" title="Our menu" text="Our menu is coming soon." /> : null;
  return (
    <section className="rb-sec" id="menu">
      <div className="rb-container">
        <h2 className="rb-title">Our menu</h2>
        {cats.length > 1 ? (
          <nav className="rb-menu-tabs center" aria-label="Menu categories">
            {cats.map((k) => <a key={k.name} href={`/menu#menu-${slug(k.name)}`}>{k.name}</a>)}
          </nav>
        ) : null}
        <p className="rb-center"><a className="rb-btn" href="/menu">See the full menu</a></p>
      </div>
    </section>
  );
}
