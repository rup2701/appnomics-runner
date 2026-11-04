# Look: how the site should feel and how to check it

Read this after contract.md. The brief says what the site says; this file says how it should look. Behaviour is in the other specs. Where the brief names a `look.preset`, use that preset below. If it names none, choose the closest one and record the choice in AGENT_LOG.md.

Nobody can show you a screenshot while you build, so every rule here is either a number you can set or a check you can run. Do the checks at the end of the shopper stage.

## Rules for every preset

- **One accent colour.** Everything else is a neutral. The accent is for the main button, links and one or two highlights. Take it from the brief's mood and record the hex value.
- **Two fonts at most**, loaded with `next/font` (no external stylesheet). One for headings, one for text. Weights 400, 500, 600 only.
- **Colour roles as CSS variables** in one place (background, surface, border, text, muted text, accent, accent text). Components use roles, never raw hex values. Tailwind 4 classes read the variables.
- **A spacing scale of 4 and 8.** Section padding is large and the same for every section. Do not invent one-off gaps.
- **Text is never part of an image.** Text over a photo sits on a dark or light overlay strong enough for body text contrast of 4.5:1 or more, and large text of 3:1 or more.
- **Line length** of 60 to 75 characters for paragraphs (`max-w-prose` or similar). Headlines wrap to at most three lines on a phone.
- **Icons** all come from `lucide-react`, one stroke width, one size per use. No emoji as icons.
- **Buttons** are at least 44px tall, have a visible keyboard focus ring, a hover state and a disabled/working state.
- **Motion** is quiet: a short fade or rise on load at most, and nothing when the visitor prefers reduced motion. No auto-playing media.
- **The brief wins over the preset.** If the brief asks for a light or a dark page, or an accent, use it even where the preset says otherwise, and record that in AGENT_LOG.md.
- **Cards** have a 1px border or a very soft shadow, never both heavy. Same radius everywhere.

## Benefits layout

The brief's `look.benefits_layout` is one of:

- `cards` (the default if it is missing): a grid of cards, using the table below.
- `rows`: one benefit per full-width row. Text on one side, an image or designed placeholder on the other, switching sides on every row. On a phone each row stacks with the image above the text. Keep the lucide-react icon next to each title. The grid table and the orphan check do not apply to this layout.
- `agent_decides`: choose `cards` or `rows`, whichever suits the number and length of the benefits and the preset, and follow that layout's rules fully. Record the choice in AGENT_LOG.md.

The owner can show, hide and reorder benefits in either layout, so the layout must still look right after an edit.

## Grids follow the number of cards

Never leave an orphan card alone on the last row.

| Cards | Desktop columns | Tablet | Phone |
|---|---|---|---|
| 1 | 1 (centred, narrow) | 1 | 1 |
| 2 | 2 | 2 | 1 |
| 3 | 3 | 1 or 3 stacked evenly | 1 |
| 4 | 2 (a 2 by 2 grid) | 2 | 1 |
| 5 or 6 | 3 | 2 | 1 |
| 7 or more | 4, or 3 if the cards are wide | 2 | 1 |

Compute the column count from the number of items, so that when the owner adds or hides a card the grid still looks right.

## When an image is missing

Imagery comes from the owner, so on first load most images are empty. An empty site must still look designed.

- **Hero without a photo:** a background made only with CSS from the accent and the neutrals (a soft gradient, optionally a faint grid or noise pattern). Never a flat grey box. Text contrast rules still apply.
- **Preview without an image:** if the brief describes a mock-up, build it in HTML and CSS inside a window frame (top bar with three dots, a title, the mock content). Use only the words the brief gives; any sample text you must invent is short, clearly generic and covered by the "Concept preview" label from the brief. If the brief describes none, show a framed placeholder with the label and the owner's description of what goes there.
- **Any other image:** a framed placeholder with a one-line label, same aspect ratio as the finished image, so nothing jumps when the real image arrives.

## Preset: deep-tech (AI, developer tools, B2B software)

Feeling: calm, precise, confident. A dark hero and dark page, lots of space, almost no decoration.

- **Fonts:** headings Space Grotesk 600, text Inter 400/500.
- **Colours (dark):** background #0B0D12, surface #11151C, border rgba(255,255,255,0.08), text #E8EAF0, muted #9AA3B2. The accent is warm or electric and chosen from the brief's mood. Text on the accent is near-black or white, whichever passes 4.5:1.
- **Type scale (desktop / phone):** hero headline 64 / 40 px, tracking -0.02em, line height 1.05; section heading 40 / 30; text 18 / 17, line height 1.6; small 14.
- **Spacing:** sections 112px top and bottom on desktop, 64px on a phone; contained column up to 1200px; hero text no wider than 720px.
- **Hero:** full screen: `min-height: 100svh` (when a demo notice bar is shown, subtract its height so the headline and the button still fit on a 375 by 667 phone without scrolling), the header floating on top of it, the content centred vertically and horizontally. A small eyebrow label (optional, from the brief), the headline, one subheadline, the main button with the note beside or beneath it. Background image dimmed with a gradient that fades into the page background at the bottom. A small scroll cue at the bottom edge is fine.
- **Preview:** large, centred, in a window frame with a soft glow in the accent colour at low opacity, and a short caption underneath.
- **Benefits:** cards with an icon, a short title and two lines of text; cards sit on the surface colour; the grid follows the card-count table.
- **Waitlist:** two columns on desktop (heading and perks on the left, the form in a card on the right), one column on a phone. Perks are a plain list with check icons.
- **Footer:** one row on desktop: name and tagline on the left, links and legal on the right. Muted text.

## Preset: dtc-brand (consumer products and brands)

Feeling: warm, human, tactile. A light page, big photography, a little more personality in the headings.

- **Fonts:** headings Fraunces 500 or 600, text DM Sans 400/500.
- **Colours (light):** background #FAF7F2, surface #FFFFFF, border #E7E0D6, text #1C1917, muted #6B635A. Accent from the brief's mood.
- **Type scale (desktop / phone):** hero headline 60 / 38 px, line height 1.08; section heading 38 / 28; text 18 / 17; small 14.
- **Spacing:** sections 96px on desktop, 56px on a phone; radius 12px; a little more room around images.
- **Hero:** photo-led and full screen (`min-height: 100svh`). Large image beside or behind the headline, never covering it. One button.
- **Benefits:** icon or small photo, short title, one line; grid follows the table.
- **Waitlist and footer:** like deep-tech but on the light surface.

## Polish rules (draft, from the owner's design review of 2026-11-03)

These come from a human's corrections of a generated page. Each one names the fault it fixes. They apply to every preset.

1. **One loudest headline per view.** In any one screen there is a single largest headline. A second headline in a side panel or beside a form is at most two steps smaller, or it becomes a caption. Two headlines of similar size fight for the first read.
2. **A picture of a page must be readable at the size it is shown.** When a screenshot or mock-up of a page sits in a panel, crop it to the part that matters (headline, product shot, main button), not the whole page at small scale. Text inside the picture is at least 12px on screen at 1440 wide, or it is cropped out.
3. **Pin the header to the edges.** The logo sits at the container's left edge and any badge or menu at its right edge, with the same side margin as the rest of the page (24px on a phone, 40px on desktop). Do not float header items inward so that they match some other block.
4. **Rounded corners on pictures follow the cards.** Pictures use the same radius as the cards. A picture that runs off one edge of the screen has square corners on that edge and the page's radius on the inner corners.
5. **Leave space between a picture and the thing beside it.** A picture next to a split line, a column or a form has a gap of at least 48px on desktop, so it never touches the divider.

## Checks to run before you finish

Add these to the end-to-end tests, as far as Playwright can measure them:

1. At 375 by 667 and at 1440 by 900: the headline and the main button are both visible without scrolling.
2. At 375 wide the page has no horizontal scroll (`scrollWidth <= innerWidth`).
3. Every block is inside the contained column: no block is wider than 1200px except the hero background and the footer background.
4. For the `cards` layout and every other grid of cards, no orphan: for each grid, the number of cards in the last row is not 1 unless there is only one card.
5. Every image has alt text, or `alt=""` if it is decoration.
6. Body text colour against its background has a contrast ratio of at least 4.5:1 (compute it from the computed styles of the hero text, the benefit text and the form labels).
7. The page with no uploaded images shows no empty box and no broken image icon.
8. For the `rows` layout: each benefit is in its own row, the image side alternates, and at 375 wide every row stacks with no horizontal scroll.
9. Polish rule 1: at 1440 by 900, take every heading (h1 to h3) that is visible at the top of the page; the second largest computed font size is not more than 75% of the largest, unless the two are the same element type in a repeated list.
10. Polish rule 3: at 1440 wide, the header logo's left edge is within 48px of its container's left edge, and the right-hand header item's right edge is within 48px of the container's right edge.
11. Polish rule 5: for every `img` or background-image block that sits beside a form or text column on desktop, the horizontal gap to its neighbour is at least 48px.

## Moves from elite product sites

These come from studying top product sites (for example tryglen.com, a product that is not a waitlist page). Apply the ones that fit an honest one-page waitlist; skip any that need proof the owner has not given.

1. **One idea per section, in a story order:** the promise, then the product shown, then why it matters, then how it works or why to trust it, then the ask. Do not stack features in one long list.
2. **Show the product as a believable interface, not a stock picture.** Build small UI panels in HTML: a chat or question transcript with the steps visible, a result table or card, a source list, a timeline. Labelled "Concept preview" when it is not the real product.
3. **Alternate layouts down the page:** a full-width block, then two columns (text one side, panel the other), then the sides swap. Never the same shape three times in a row.
4. **Number the steps** of "how it works" (1, 2, 3) and give each one a small panel.
5. **A before and after** panel when the idea is a change from today ("without" and "with"), side by side, in the same frame so the difference is the only thing that changes.
6. **A trust block** when the brief has privacy or security claims: a small table or list of exactly what is and is not accessed. Only claims marked confirmed in the brief; otherwise leave the block out.
7. **Proof is real or absent.** Logos, numbers, testimonials and "used by" strips appear only when the brief supplies them. Never invent them. A waitlist with no proof relies on a sharp promise and a believable product panel instead.
8. **Repeat the ask at the end** with a short closing headline and the same form or a button that scrolls to it.
9. **Small touches that signal care:** copy-to-clipboard feedback if there is a command, a clear success state, consistent icon style, real text in every panel, tidy alignment to one grid.
10. **A custom illustration or pattern rather than a stock photo** where the owner has no image: simple SVG shapes in the accent and the neutrals.

Under "Decisions on ambiguous points" in AGENT_LOG.md, list the preset, the fonts, the accent hex and anything you changed from the preset, with the reason.
