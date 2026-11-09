# Look: how the site should feel and how to check it (product showcase)

Read this after contract.md. The brief says what the site says; this file says how it looks. Behaviour is in the other specs. These rules are for any product: nothing here is tied to one product, one colour or one industry. The brief supplies the colour mode, the accent and the tone; this file turns them into numbers.

You cannot see the page while you build, so every rule is a number you can set or a check you can run. Do the checks at the end of the page stage.

If the brief has `look.references`, each is a layout the owner likes from another site, already described in numbers. Follow that layout in our own words, icons and colours. Never copy another site's text, logos, images or brand.

## Inputs from the brief

- `look.mode`: `light` or `dark`. The brief's `brand.color` decides: light and blue-accent use `light`; dark uses `dark`. (`look.preset` is `showcase-light` or `showcase-dark`.)
- `look.accent`: one hex colour. If it is missing, choose one that suits the tone (calm: a blue or teal; bold: a vivid green, orange or violet; playful: a warm pink or yellow-orange; serious: a deep blue or slate), and record it. A blue-accent choice means a blue accent.
- `look.tone`: `calm`, `bold`, `playful` or `serious` (from `brand.tone`). The tone table below sets the character.
- `look.card_edge`: `blended` or `defined` (optional). Decides how cards are told apart from the page; see Depth and polish. Default by tone.
- The brief wins over this file. If the brief asks for something else, do that and record it in AGENT_LOG.md under "Decisions on ambiguous points".

## Colour roles

Set these as CSS variables in one place. Components use roles, never raw hex values.

| Role | Light mode | Dark mode |
|---|---|---|
| background | #FFFFFF | #0B0F0D |
| surface | #F4F6F5 | #151B18 |
| border | #E4E7E5 | #232B27 |
| text | #0B0F0D | #FFFFFF |
| muted text | #5B6560 | #A9B4AE |
| inverse block | #0B0F0D (text on it #FFFFFF) | #FFFFFF (text on it #0B0F0D) |
| accent | the brief's accent | the brief's accent |
| text on accent | near-black #04130D or white, whichever gives 4.5:1 or more; prefer near-black | the same |

If neither near-black nor white reaches 4.5:1 on the accent, move the accent lighter or darker until one does, and record the final hex. Accent used as text (eyebrow labels, links) must reach 4.5:1 against its background; where it does not, use the text colour and keep the accent for fills and borders.

### Accent tints

The accent is the 500 step of a scale. Build the rest from it: same hue, steps 50, 100, 200, 300 lighter (in OKLCH about L 97.5, 95, 91 and 86, keeping as much of the accent's chroma as sRGB allows) and 700, 900 darker. Record the six hex values in AGENT_LOG.md. If the owner gives their own scale, use it. For example, with 500 `#00b377`: 50 `#eafff5`, 100 `#cdfee5`, 200 `#a0fad0`, 300 `#63f2b9`.

- **Light mode:** tints 50 to 300 may be backgrounds, solid or as a gradient (see "Where the accent colour goes"). Text on them is the text colour (4.5:1 or more). Accent used as text on a tint must reach 4.5:1; where it does not, use the 700 step.
- **Dark mode:** the same idea mirrored. Backgrounds use the 900 step, or a gradient between 900 and the dark surface. Text on them is white.
- **500 itself is never a large background.** It fills buttons and appears as lines and text.

## Type, space and shape

- **Font:** Inter only, loaded with `next/font` (no external stylesheet).
- **Tone table** (desktop / phone):

| | calm | bold | playful | serious |
|---|---|---|---|---|
| Display weight (hero, section and closing headlines only) | 600 | 800 | 700 | 600 |
| Hero headline | 64 / 38 px, tracking -0.03em | 80 / 42 px, -0.04em, line height 1.0 | 68 / 40 px, -0.035em | 56 / 34 px, -0.02em |
| Section heading | 44 / 30 | 68 / 36 | 52 / 32 | 40 / 28 |
| Card radius | 16 px | 28 px | 32 px | 8 px |
| Section padding | 120 / 72 px | 112 / 64 px | 104 / 64 px | 112 / 64 px |
| Accent use | links, button, outlines and strokes; tint 50 as a solid fill on the large bento card | button, strokes and text; tints 50 to 300 as solid or gradient fills on the large bento card, the closing block and one section band | as bold | button, strokes and text; tint 50 as a solid fill on the closing block only |
| Motion | hover only | hover lift and rise on scroll | hover lift and rise on scroll | none |

- **Body text:** 18 / 17 px, line height 1.6, regular weight (400), headings per the table. Small text 14. Paragraph lines 60 to 75 characters.
- **Hero headline** on a phone uses `clamp` so it wraps to three lines at most at 375 px.
- **Hero spacing.** The hero is a centred stack with room between its parts: at least 28 px (20 px on a phone) between the headline's box and the supporting line, so tight headline line heights never leave letters touching the line below; at least 32 px between the supporting line and the buttons; and when chips or other small items sit between the line and the buttons, at least 32 px above and below them, with the chips in one centred row (wrapping onto centred rows on a phone) and neutral or a solid tint 50 or 100, never filled with the full accent. These are defaults: when the owner explicitly asks for tighter or looser spacing, follow the request, as long as nothing touches, overlaps or crowds (keep at least 12 px between parts) and the main button stays on the first screen of a 390 px wide phone.
- **Layout:** a contained column up to 1200 px; side margin 24 px on a phone, 40 px on desktop. Spacing from a scale of 4 and 8. Section padding as in the table, the same for every section.
- **Weight tiers.** Only the hero, section and closing headlines use the tone's display weight. Card titles, plan names, FAQ questions, nav links and buttons use weight 600; the quote text in testimonials 600; body 400. Eyebrows and numerals may use 700. Nothing but a headline is heavier than 700. If every piece of text is extra bold, nothing leads.
- **Alignment is centred for the page's own text, left inside content.** The hero is one centred stack: headline, supporting line, buttons. Each section opens with one centred block: the small eyebrow (13 px, bold, uppercase, tracking 0.12em, accent where it passes contrast), the heading, and an optional one-line support, no wider than 640 px. A block is centred by centring the box (auto side margins), never only by centring its text inside a box that sits to the left. The hero's supporting line is also a box centred in the column, no wider than 640 px. Under that block, cards, steps, plans and the FAQ use the full contained column. Text inside a card, a FAQ answer or a plan's feature list is left-aligned.
- **Cards** all have the same radius, the same padding (32 px on desktop, 24 px on a phone) and either a 1px border or a very soft shadow, never both heavy. Every card in a section uses the same padding, so edges and text line up.
- **Where the accent colour goes.** The full accent (500) is the background of buttons and nothing else large. Large surfaces use its tints (50 to 300 in light mode; see Accent tints) instead: in the bold and playful tones the large benefits card, the closing block and at most one section band may be tint blocks, solid or as a gradient, and the calm and serious tones use a solid tint 50 as the tone table says. Mark each tint block with `data-tint-block`; at most three on a page, none narrower than 300 px. A **gradient** stays inside the tints: a linear gradient at 135 degrees from tint 50 or 100 to tint 200 or 300, or a radial gradient (a soft spot of tint 200 or 300 in a corner or at the top centre, fading to tint 50 or 100). It never runs to the full accent, and never to a second hue. Small things (icon tiles, badges, labels, tags, step numbers, highlight chips) may take a **solid tint 50, 100 or 200** as a background, never the full accent and never a gradient. Text on them is the text colour, or the accent where it reaches 4.5:1, otherwise the 700 step. Use them with restraint: tinted small things on one page share a single step, so the page reads as one family and not a patchwork. Everywhere else the accent appears as a line or as text: the stroke of an icon, a border, an underline, a numeral, an eyebrow label, a link, a focus ring.
- **Icons** come from `lucide-react`, one stroke width, outline only. An icon may sit on a neutral tile (the surface role or a very light grey) or on a solid tint 50, 100 or 200 tile, never on the full accent. The stroke is the accent (it must reach 3:1 against what it sits on, otherwise the 700 step) or the text colour. No emoji as icons. Benefit cards use numerals (see the benefits grid).
- **Buttons** at least 44 px tall, a visible focus ring, hover and disabled states. The main button is the accent with text-on-accent colour, on a tint block as well; on an inverse block it is the accent.
- **Text is never part of an image.** Text over an image sits on an overlay that keeps body text at 4.5:1 and large text at 3:1.

## Motion

Reduced motion switches all of it off. Calm: a small colour change on hover only. Bold and playful: cards lift 4 px on hover (250 ms), and each section rises 24 px and fades in once as it enters the view (400 ms, `IntersectionObserver`, never repeating). Serious: none. No auto-playing media.

## Hero

Centred, not full screen. Eyebrow (optional), the headline, one subheadline (no wider than 56 characters per line), then the main button and, if the brief has one, a quieter secondary button beside it. Below, the image placeholder: one plain box up to 1100 px wide, aspect 16:10, surface colour, 1px border, card radius, labelled "Your product image goes here". No mock-up is drawn. When the owner supplies an image it fills the same frame. The headline and the main button are both visible without scrolling at 1440 by 900 and at 375 by 667.

## Benefits grid (bento)

A true bento: cards of different sizes, on a 4-column grid on desktop with rows at least 190 px tall and a 16 px gap. The grid is built from the number of cards, so nothing is left over and no gap appears when the owner adds or hides a card:

| Cards | Layout (columns by rows) |
|---|---|
| 1 | one card, 4 by 1 |
| 2 | two cards, 2 by 1 each |
| 3 | large 2 by 2, then two wide 2 by 1 stacked on the right |
| 4 | large 2 by 2, wide 2 by 1, two small 1 by 1 |
| 5 | large 2 by 2, four small 1 by 1 |
| 6 | large 2 by 2, wide 2 by 1, two small 1 by 1, then two wide 2 by 1 |

On a phone every card is full width in one column, and the large card keeps its larger title.

- **The first benefit is the large card**, the most important claim. It is the one the owner would pick if they could pick only one.
- **Card contents:** a small numeral (01, 02, ...) at the top, then the title and one supporting line, bottom-aligned. The numeral sits in the flow of the card and never overlaps the title. No icon squares.
- **Title size follows card size:** large card `clamp(32px, 4vw, 54px)` and tight line height; wide card 26 px; small card 22 px. Supporting text 16 px (large card 18 px). A card whose title is larger because of its size is a real size difference, not a single enlarged heading in an equal grid.
- **Fills (bold and playful):** the large card is a tint block (text colour on it), one wide card is an inverse block, the rest are surface cards. At most one tint block and one inverse block per grid, and the tint block is the large card only. **Calm:** surface cards; the large card is a solid tint 50 with an accent numeral and a 1.5 px accent border. **Serious:** the large card is an inverse block, the rest surface cards.
- Text on every fill meets 4.5:1.
- A card the owner adds later takes the next place in the table for the new count.

## Section shapes

Page order: hero, benefits, how it works, (optional: examples gallery, comparison table, use-case cards), pricing, testimonials, FAQ, closing call to action, footer. A section the owner switched off is not on the page. Sample sections carry a small muted "Sample" label.

1. **How it works:** heading, then up to three columns, each with a numeral (large text in the accent or text colour, no filled circle), a title and one line; on a phone they stack.
2. **Pricing:** one card per plan, columns equal to the number of plans (1 centred and narrow, 2, or 3), equal heights, buttons aligned at the bottom. With monthly and yearly billing, a two-option switch (Monthly / Yearly) above the cards, Monthly by default, with a "Save N%" note beside Yearly. The highlighted plan (only if the owner marked it) has an inverse block fill (bold, playful) or a 2 px accent border (calm, serious), and a "Most popular" label. Each card: plan name, large price, period small, on Yearly the per-month equivalent in small text, a feature list with check icons (outline stroke in the accent or text colour, no filled circles), one button (the main button). The "Most popular" label is an outlined pill (1px accent border, accent or text colour for the words), never a filled one.
3. **Testimonials:** a row of cards. On desktop three cards are visible at once, each a third of the width minus the gaps; the row scrolls sideways with scroll-snap and a hidden scrollbar. On a phone one card is about 85% wide so the next card shows. Round previous/next buttons (44 px) sit centred under the row, work with the keyboard, and are disabled at the ends; they appear only when there are more cards than fit. Each card has the same height (at least 300 px): the "Sample" label first, in the flow of the card and never over the quote; then the quote (22 px, weight 600, line height 1.3); then the name, role and company at the bottom. With real quotes: one real quote is a single card at normal card width, centred; two are two cards. With none, the brief gives three sample quotes, each labelled "Sample". Never a photo or logo the owner did not supply; use initials in a circle.
4. **FAQ:** the centred section heading block, then 3 to 6 questions as an accordion in one column, centred on the page, between 640 and 960 px wide at 1440 (on a phone the full width), a 1px divider between items, the question left-aligned with a plus or chevron at the right end of the row that turns when open, a visible focus ring. A column left-aligned in the page with empty space beside it looks unfinished; centre it.
5. **Optional sections:** examples gallery (a grid of up to six labelled cards), comparison table (up to five rows and three columns, our product highlighted), use-case cards (up to four, each with a numeral, a title and one line).
6. **Closing call to action:** one full-width block with a radius 1.3 times the card radius and a large section-heading-sized headline (centred, no wider than 16 characters per line), one supporting line and the same pair of buttons as the hero (the main button and, if the brief has one, the quieter secondary button beside it), or the closing pair the brief sets. Fill: tint block (bold, playful), surface (calm), solid tint 50 or inverse block (serious). The button is the accent (with text-on-accent colour) on a tint block, a surface or an inverse block.
7. **Footer:** surface colour with a 1px top border. A top row: name and tagline on the left; three link columns on the right (Product: the page's own sections, including the FAQ; Company; Resources). A bottom row: the copyright line, and the Privacy, Terms and Security links. Every link goes to a real target: an anchor on the page, a mailto, or a URL from the brief; a link with no page points to the top of the page and is listed as "Set your link". No `href="#"`.

## When an image is missing

Imagery comes from the owner, so on first load most images are empty. An empty site must still look designed.

- **Hero image:** the labelled placeholder box above. Never a flat grey box without a label.
- **Any other image:** a framed placeholder with a one-line label and the same aspect ratio as the finished image, so nothing jumps when the real image arrives.
- **A custom pattern rather than a stock photo:** simple SVG shapes in the accent and the neutrals where a background is needed.

## Polish rules (from a human's design review)

Each names the fault it fixes. They apply in every tone and mode.

1. **One loudest headline per view.** In any one screen there is a single largest headline. A second one beside it is at most two steps smaller, or becomes a caption.
2. **A picture of a page must be readable at the size it is shown.** Crop a screenshot to the part that matters; text inside it is at least 12 px on screen at 1440 wide, or is cropped out.
3. **Pin the header to the edges.** The logo sits at the container's left edge and the menu or button at its right edge, with the same side margin as the page.
4. **Rounded corners on pictures follow the cards.**
5. **Leave space between a picture and the thing beside it:** at least 48 px on desktop.
6. **Elements in a card never overlap.** A label, numeral, icon or badge sits in the card's flow, not absolutely positioned over the text.
7. **Equal things are equal.** Cards in one section have the same padding, and icons or numerals in a column line up.

## Depth and polish

A flat white page with plain boxes looks unfinished. Every build gets three layers of depth, and the tone sets how strong each is. The numbers are floors, not decoration: **a layer the owner cannot see is a layer that is missing.** A pale value that passes a test but cannot be seen on a normal screen counts as missing.

| Layer | calm | bold | playful | serious |
|---|---|---|---|---|
| Page background: dot grid | 16 px grid, 1 px dots | same | same, dots 2 px | 16 px grid, 1 px dots, fewer (hero area only) |
| Page background: top-centre glow | accent at 8% | accent at 16% (dark mode 22%) | accent at 14% (dark mode 20%) | none |
| Card surface | solid fill, edge style below, no blur | glass: fill at 75% opacity, 12 to 16 px background blur, edge style below | glass as bold | solid fill, edge style below, no blur |
| Card edge style (default) | blended | blended | blended | defined |
| Card shadow | soft: 0 1px 2px at 6%, 0 8px 24px at 6% | soft, a little stronger at hover | as bold | 0 1px 2px at 6% only |
| Section headings | tracking -0.02em, weight per tone table | -0.03em | -0.025em | -0.02em |

How to set each, so the result can be seen:

- **Dot grid.** The dot colour is the text colour at about 16% (light mode) or 14% (dark mode). It must reach 1.4:1 against the page background and stay under 2.2:1, so it is seen on a normal screen but never competes with text. The grid covers the whole page; a band with its own solid fill (surface or inverse) simply covers it.
- **Glow.** One radial ellipse of the accent, about 60% wide and 50% tall, centred at the top of the first screen. It sits behind the hero and fades to nothing before the second section.
- **Card edge style: blended or defined.** The brief's `look.card_edge` says which (`blended` or `defined`). If it is missing, use `blended` for calm, bold and playful, and `defined` for serious. The owner can change it by asking in everyday words ("softer borders", "let the cards blend in" means blended; "sharper cards", "clearer outlines" means defined).
  - **Blended:** no dark outline. The edge is a 1 px light highlight, strongest at the top and fading toward the bottom (white at 50% in light mode, white at 12% in dark mode), never darker than the border role. The card is told apart from the page by its glass fill (it differs from what is behind it by at least 1.03:1) and by a soft shadow (blur at least 16 px, opacity at least 6%).
  - **Defined:** a 1 px gradient edge from a lighter to a darker tint of the border role. The lightest part of the edge reaches 1.3:1 against the page background.
  - Either way a card must be told apart from the page. A white card on a white page with a pale edge and no shadow is the fault this rule prevents.
- **Glass only where something shows through.** Blur and transparency need a grid or glow behind the card; where the card sits on a flat band, use a solid fill. Calm and serious tones never blur.
- **Headline and support text.** The headline is the text colour at the tone's weight; supporting text is the muted role (4.5:1 or better), at weight 400. They differ in colour and in weight, so the headline clearly leads.
- **Do not trade away what is already there.** If a change removes a visible texture (a hero grid, a border, a shadow), what replaces it must be at least as visible.

**When the owner asks in everyday words, apply this section; never ask for hex codes, pixel sizes or em values.**

- "more premium", "more polished", "more modern", "less flat", "add depth", "feels cheap": apply every row of the table at the site's tone.
- "bolder", "more energy": raise the strength by one step (calm to bold values for glow and cards); keep the site's tone name and colours.
- "calmer", "simpler", "cleaner", "too busy": remove the glow and the blur, keep the dot grid at the lower end of its range, keep the edges.
- If the owner does give a number or a colour, use it, unless it fails a check; then use the nearest value that passes and say so in one plain sentence.

## Moves from good product sites

1. **One idea per section, in a story order:** the promise, the product shown, why it matters, how it works, the ask.
2. **Alternate layouts down the page:** a full-width block, then two columns, then the sides swap. Never the same shape three times in a row.
3. **Number the steps** of "how it works".
4. **Proof is real or absent.** Logos, numbers, ratings and "used by" strips appear only when the brief supplies them. A page with no proof relies on a sharp promise and a clear product image.
5. **Repeat the ask at the end** with a short closing headline and the main button.
6. **Small touches that signal care:** consistent shapes, real text in every panel, tidy alignment to one grid.

Under "Decisions on ambiguous points" in AGENT_LOG.md, list the mode, the tone, the accent hex (and any change made for contrast) and anything changed from these rules, with the reason.

## Checks to run before you finish

Add these to the end-to-end tests, as far as Playwright can measure them:

1. At 375 by 667 and at 1440 by 900, the headline and the main button are visible without scrolling, and the top of the image placeholder is below the bottom of the button.
2. At 375 wide the page has no horizontal scroll (`scrollWidth <= innerWidth`).
3. Every block is inside the contained column: none is wider than 1200 px except background fills.
4. No grid of cards leaves an orphan card alone on its last row.
5. Every image has alt text, or `alt=""` if decoration.
6. Body text colour against its background is at least 4.5:1 (hero text, card text, form-free labels), and so is text on every fill (tint block, inverse block, surface).
7. The page with no uploaded images shows no empty box without a label and no broken image icon.
8. At 1440 by 900, the second largest of the visible headings (h1 to h3) is not more than 75% of the largest, unless they are the same element type in a repeated list.
9. At 1440 wide, the header logo's left edge is within 48 px of its container's left edge, and the right-hand header item's right edge is within 48 px of the container's right edge.
10. Any image beside a text column on desktop has a gap of at least 48 px.
11. Sections switched off do not exist in the page or the navigation. Sample sections carry a "Sample" label, and no block contains "Lorem".
12. Every link has a real target: no `href="#"`, no empty `href`, every anchor target exists.
13. With a main button link set, every main button opens it; with none, every main button scrolls to the pricing section (the closing section when pricing is off).
14. Prices: every price shown equals the plan data; yearly and per-month figures are whole dollars rounded down; the FAQ and the pricing section show the same figures.
15. The FAQ opens and closes with the keyboard. The footer has the Product, Company and Resources columns and the Privacy, Terms and Security links.
16. Bento: with three or more cards at 1440, at least two distinct card areas exist; every card has the same computed padding; the numeral's box does not overlap the title's box in any card; no benefit card has an icon square.
17. Testimonials: with two or more quotes at 1440, at least two cards are visible at once; the "Sample" label's box does not overlap the quote's box; with more than three quotes a scroll container exists and the next button scrolls it by at least one card.
18. Tone: the hero headline's computed font size at 1440 equals the tone's size (within 2 px) and its weight equals the tone's weight.
19. With reduced motion requested, no element has a running transition or animation.
20. Accent backgrounds: every element whose computed background is the full accent is a button. Every element whose background is a tint of the accent carries `data-tint-block`; there are at most three of them, none narrower than 300 px, and every colour stop in their backgrounds is a tint (light mode: OKLCH lightness 0.84 or more; dark mode: the 900 step or darker), never the accent itself. Small elements (icon tiles, badges, chips, tags, step numbers) may have a solid background of tint 50, 100 or 200 (OKLCH lightness 0.90 or more in light mode), never a gradient and never the full accent, and the tinted ones on one page share a single step.
21. Dot grid: crop an empty 300 by 200 area of the page background at 1440 (no text) from a screenshot. Between 0.3% and 6% of its pixels differ from the background colour, and the most different pixel reaches at least 1.4:1 against it. Measure the picture, not the CSS variable.
22. Glow (tones with a glow): in a screenshot of the top 600 px, the pixel at the top centre differs from the pixel at the far left of the same row by at least 3% in luminance, and the glow's colour leans toward the accent.
23. Cards: for every card at 1440, the card is told apart from the page behind it. Defined: the lightest part of its edge reaches 1.3:1 against the page background. Blended: its fill differs from the page behind it by at least 1.03:1 and it has a shadow (blur 16 px or more, opacity 6% or more); no border darker than the border role. Calm and serious cards have no `backdrop-filter`; bold and playful cards on a grid or glow have a blur between 12 and 16 px.
24. Headline and support text: in each section the heading and its supporting paragraph differ in computed colour and in font weight, and the paragraph reaches 4.5:1.
25. Tests for look rules sample a screenshot or computed values of the rendered page. A test that only reads a CSS variable does not count for rules 21 to 24 and 26 to 29.
26. Centring: at 1440 and at 375, the horizontal centre of the hero's supporting paragraph box, and of each section's eyebrow, heading and support-line box, is within 8 px of the page's horizontal centre. Measure the boxes (`getBoundingClientRect`), not `text-align`.
27. Weights: at 1440, the hero, section and closing headlines have the tone's display weight; card titles, plan names, FAQ questions, nav links and buttons have a computed weight of 600 or less; no element other than a headline has a weight above 700.
28. FAQ: at 1440 the accordion box is between 640 and 960 px wide and its centre is within 8 px of the page's centre.
29. Hero spacing: at 1440 and at 375, the gap from the bottom of the h1 box to the top of the supporting line is at least 28 px (20 px at 375), and from the supporting line to the first button or chip row at least 32 px, unless the owner asked for tighter spacing (then at least 12 px between any two parts). Any chip row in the hero is centred within 8 px of the page's centre, and no chip has the full accent as its background.
