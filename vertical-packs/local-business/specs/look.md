# Look: restaurant_001 and how to check it (local business)

Read this after contract.md. The brief says what the site says; this file says how it looks. The look is already built: it is the reference in `reference/`, copied as written. Your job is to feed it the brief's content, set the accent, load the fonts and check the result. Do not redesign sections and do not add new ones.

## Inputs from the brief

- `look.design` is `restaurant_001`. No other design exists in this version; if the brief names another, use restaurant_001 and record it in AGENT_LOG.md.
- `look.accent` is one hex colour, set as `--accent` on the page wrapper (the reference page component does this from `content.accent`). Pick it from the brief's mood if it names none, and record the value. Everything else is a neutral.
- `look.mode` is light. A dark page is not part of this design.
- `story` (heading, body, optional image) becomes `Content.story`. It is present only when the brief has real story words.
- `images.use_photos` becomes `usePhotos`. It is true only when `images.owner_confirmed` is true, or when the brief has `private_test: true` (a private test is never published).

## Pages

The site has three routes, built from the reference page components. Do not add other pages in this version.

- `src/app/page.tsx` renders `<RestaurantPage c={content} />` (home).
- `src/app/menu/page.tsx` renders `<MenuPage c={content} />`. If `hasMenu(content)` is false, call `notFound()`.
- `src/app/story/page.tsx` renders `<StoryPage c={content} />`. If `hasStory(content)` is false, call `notFound()`.
- Give each page its own `generateMetadata` title (the restaurant name, then Menu or Our story) using only words from the brief.
- Add a `sitemap` only for routes that exist.

## Tokens (in `restaurant.css`, do not scatter new values)

| Role | Value |
| --- | --- |
| Text | #222222; muted #666666; soft #888888 |
| Surfaces | white, alt #f8f9fa, card #fafafa, border #e9ecef |
| Accent | from the brief; hover is the accent mixed 12% with black |
| Text on accent | white, or near-black when white is under 4.5:1. Set `--accent-text` yourself; the stylesheet defaults to white |
| Corners | buttons 8px, cards 12px, panels 16px, hero card 20px |
| Shadow | cards 0 2px 8px rgba(0,0,0,0.08), hover 0 8px 24px rgba(0,0,0,0.12) |
| Section padding | 100px desktop, 64px phone; content column up to 1200px |
| Type | h1 and h2 3rem desktop, 2.2rem phone; h3 1.35rem; lead 1.3rem; body 1rem at 1.6 |
| Fonts | Two at most, loaded with `next/font`, set as `--font-heading` and `--font-body`. Default DM Sans for both. Weights 400, 500, 600, 700 |

## Section shapes (all in the reference)

- **Top bar:** fixed, translucent white with blur, gains a shadow after 50px of scroll. Name in the accent colour, links, one accent button.
- **Hero:** at least 65vh. A floating white card (20px corners) over a dark scrim on a photo or an accent colour field. The restaurant name is the h1.
- **Highlights:** up to six cards in an auto-fit grid, picture strip only with a real picture.
- **Full menu:** category chips, then each category with an accent underline and a two column list that wraps to one column on phones.
- **About:** two columns with a picture, one column without.
- **Gallery:** three columns on desktop, two on tablets, one on phones; every fifth tile double wide from five tiles up; equal row height.
- **Reviews, catering, ways to enjoy us, footer:** as in the components.

## When something is missing

- **No photo for the hero:** a colour field made from the accent and a deep neutral, under the same dark scrim. Never a flat grey box and never a stock photo.
- **Pictures not allowed:** gallery tiles are labelled colour blocks (from each picture's alt text); dish cards have no picture strip; highlights drop out unless dishes are pinned.
- **No about picture:** one column. No invented slogan or caption.
- **No reserve link and no phone:** no reserve button, bar or card.

## Rules for every build

- One accent colour, two fonts at most, colour roles as CSS variables. Components never use a raw hex value.
- Text is never part of an image. Text over a photo sits on the dark scrim (4.5:1 for body text, 3:1 for large text).
- Buttons are at least 44px tall, have a visible keyboard focus ring, a hover state and no emoji as icons.
- Motion is quiet and switched off for visitors who prefer reduced motion. No auto-playing media.
- Links that open another site use `target="_blank"` and `rel="noopener noreferrer"`.
- The brief wins over this file for the accent and the sections switched off. Record any such choice in AGENT_LOG.md.

## Checks to run before you finish

1. Open the page at 360px and 1440px. There is no horizontal scrolling.
2. Count the h1 elements on each page. There is exactly one. On the home page it is the restaurant's name; on /menu it is Menu; on /story it is the story heading.
3. Search the page for `href="#"` and empty links. There are none.
4. With `show_prices` false, search the page for a currency sign. There is none.
5. Compare the number of dishes on /menu with the brief's.
6. Diff `src/lib/content.ts`, `src/components/restaurant/` and `src/styles/restaurant.css` against `reference/`. They are the same. `src/components/lib/content.ts` is the one-line re-export described in reference/README.md.
7. Check the text on every accent button against the accent for 4.5:1.
8. With the brief's pictures switched off (`usePhotos` false), confirm no `<img>` from the owner's site is on the page.
9. Open /, /menu and /story at 360px and 1280px. /menu and /story exist only when the brief has a menu or a story; every top bar link goes somewhere that exists; the home page shows only the first paragraph of the story, with a link to the rest.
