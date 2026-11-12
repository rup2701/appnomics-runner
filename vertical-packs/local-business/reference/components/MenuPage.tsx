import type { Content } from "../lib/content";
import { FullMenu } from "./FullMenu";
import { Shell } from "./Shell";

/** The full menu (src/app/menu/page.tsx). Render it only when the menu has dishes; otherwise this route should not exist. */
export function MenuPage({ c, year = new Date().getFullYear() }: { c: Content; year?: number }) {
  return (
    <Shell c={c} year={year}>
      <main className="rb-page"><FullMenu c={c} /></main>
    </Shell>
  );
}
