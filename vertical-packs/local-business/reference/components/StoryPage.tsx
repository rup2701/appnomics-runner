import type { Content } from "../lib/content";
import { Shell } from "./Shell";
import { Story } from "./Story";

/** The owner's story (src/app/story/page.tsx). Render it only when hasStory(c) is true; otherwise this route should not exist. */
export function StoryPage({ c, year = new Date().getFullYear() }: { c: Content; year?: number }) {
  return (
    <Shell c={c} year={year}>
      <main className="rb-page"><Story c={c} /></main>
    </Shell>
  );
}
