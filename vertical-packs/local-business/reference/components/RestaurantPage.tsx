import { visibleSections, type Content } from "../lib/content";
import { About } from "./About";
import { Catering } from "./Catering";
import { Gallery } from "./Gallery";
import { Hero } from "./Hero";
import { MenuHighlights } from "./MenuHighlights";
import { MenuTeaser } from "./MenuTeaser";
import { Reviews } from "./Reviews";
import { Shell } from "./Shell";
import { WaysToOrder } from "./WaysToOrder";

/**
 * restaurant_001 home page (src/app/page.tsx). Import "../styles/restaurant.css" once in the root layout.
 * Everything shown comes from `c`; visibleSections() decides which sections exist, so a missing part never leaves an empty box.
 * The full menu is /menu (MenuPage) and the owner's story is /story (StoryPage).
 */
export function RestaurantPage({ c, year = new Date().getFullYear() }: { c: Content; year?: number }) {
  const shown = visibleSections(c).filter((id) => id !== "footer");
  const parts: Record<string, React.ReactNode> = {
    hero: <Hero c={c} key="hero" />,
    highlights: <MenuHighlights c={c} key="highlights" />,
    menu: <MenuTeaser c={c} key="menu" />,
    about: <About c={c} key="about" />,
    gallery: <Gallery c={c} key="gallery" />,
    reviews: <Reviews c={c} key="reviews" />,
    catering: <Catering c={c} key="catering" />,
    ways: <WaysToOrder c={c} key="ways" />,
  };
  return (
    <Shell c={c} year={year} slimBar>
      <main>{shown.map((id) => parts[id])}</main>
    </Shell>
  );
}
