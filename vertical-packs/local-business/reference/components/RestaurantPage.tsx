import { reserveMode, visibleSections, type Content } from "../lib/content";
import { About } from "./About";
import { Catering } from "./Catering";
import { Footer } from "./Footer";
import { FullMenu } from "./FullMenu";
import { Gallery } from "./Gallery";
import { Hero } from "./Hero";
import { MenuHighlights } from "./MenuHighlights";
import { Nav } from "./Nav";
import { PageBehaviour } from "./PageBehaviour";
import { Reviews } from "./Reviews";
import { WaysToOrder } from "./WaysToOrder";

/**
 * restaurant_001 page. Import "../styles/restaurant.css" once in the root layout.
 * Everything shown comes from `c`; visibleSections() decides which sections exist, so a missing part never leaves an empty box.
 */
export function RestaurantPage({ c, year = new Date().getFullYear() }: { c: Content; year?: number }) {
  const shown = visibleSections(c);
  const r = reserveMode(c);
  const parts: Record<string, React.ReactNode> = {
    hero: <Hero c={c} key="hero" />,
    highlights: <MenuHighlights c={c} key="highlights" />,
    menu: <FullMenu c={c} key="menu" />,
    about: <About c={c} key="about" />,
    gallery: <Gallery c={c} key="gallery" />,
    reviews: <Reviews c={c} key="reviews" />,
    catering: <Catering c={c} key="catering" />,
    ways: <WaysToOrder c={c} key="ways" />,
    footer: <Footer c={c} year={year} key="footer" />,
  };
  return (
    <div className="rb" style={{ ["--accent" as string]: c.accent }}>
      <Nav c={c} />
      {r.href ? (
        <div className="rb-sticky" id="rb-sticky">
          <div className="rb-container rb-sticky-in">
            <strong>{c.name}</strong>
            <a className="rb-btn" href={r.href} {...(r.mode === "link" ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{r.label}</a>
          </div>
        </div>
      ) : null}
      <main>{shown.filter((id) => id !== "footer").map((id) => parts[id])}</main>
      {parts.footer}
      <PageBehaviour />
    </div>
  );
}
