# Creative direction: what makes this product's site look like itself

Read this right after `look.md`. `look.md` is the execution layer: spacing, contrast, depth, checks. This file is the direction layer. It decides what is distinctive about this product, so that two products built with this pack do not look alike. The two never conflict: **every `look.md` check still passes whatever direction is chosen.** Direction changes the character, never the quality floor.

You choose the direction. The interview does not ask for it. Choose from what the product does, who uses it and the brief's tone, colour mode and brand words. Two different products should rarely end up with the same pairing, motif and hero kind together.

## Record the choice in two places

1. **`src/theme.ts`**, the site's theme file. It exports one object, `direction`, and the page reads its fonts and choices from it:

```ts
export const direction = {
  pairing: "Heavy geometric",   // a name from the pairing table
  headingFont: "Outfit",
  bodyFont: "Inter",
  accentFont: null,             // or the mono font the pairing names
  headingWeight: 800,           // the weight the pairing declares
  capsLabels: true,             // true when the pairing asks for uppercase nav and labels
  motif: "Stack",               // a name from the motif table
  heroKind: "fragment",         // frame, fragment or owner-art
  heroLayout: "split",          // centred, or split (only with a fragment)
  signatures: ["oversized-numerals"], // one or two names from the signature list
} as const;
```

2. **AGENT_LOG.md**, under "Decisions on ambiguous points": the pairing, the motif, the hero kind, the hero layout and the signature elements, each with one line on why it fits this product.

Later changes read `direction` and keep it. When the owner asks for a different look in everyday words (see "Plain-words changes"), the change updates `direction` and the page together.

## 1. Typography: choose one pairing

Choose from this list only. All of them load through `next/font/google`, so a build never depends on a font that fails to load.

| Pairing | Headings | Headline weight | Body | Accent font (labels, numerals) | Fits |
|---|---|---|---|---|---|
| Neutral modern | Inter | the tone's display weight (look.md tone table) | Inter | none | calm, serious, plain |
| Grotesk and mono | Space Grotesk | 600 | Inter | JetBrains Mono | technical products, data |
| Editorial | Fraunces | 600 | Inter | none | calm, premium, writing-led products |
| Soft geometric | Plus Jakarta Sans | 700 | Plus Jakarta Sans | none | playful, friendly, consumer |
| Sharp technical | IBM Plex Sans | 600 | IBM Plex Sans | IBM Plex Mono | serious, developer-facing |
| Display contrast | Sora | 700 | Inter | none | bold, confident |
| Heavy geometric | Outfit | 800 | Inter | none | bold, sports, gaming, consumer apps with a strong voice |

Rules:
- **The pairing sets the headline weight**, in every tone. The tone table's display weight in `look.md` applies only with Neutral modern. Hero, section and closing headlines use this weight; nothing else does.
- **Only headlines go above 700.** Card titles, plan names, FAQ questions, nav links and buttons stay at 600 or less. The logo, the titles inside the hero's fragment (a matchup on a pick card), step titles and prices use 700. Eyebrows and numerals may use 700. One exception: with the `oversized-numerals` signature, the oversized numerals (a plan's length or a step numeral) count as the signature and may use the headline weight, up to 800. Each carries `data-signature="oversized-numerals"`.
- **Heavy geometric uses uppercase nav and labels:** nav links, eyebrows, buttons and small labels are uppercase, with letter spacing of at least 0.08em (eyebrows keep 0.12em). Headlines and paragraphs are never uppercase. Set `capsLabels: true`.
- At most two families plus one mono accent. Load only the weights used, `display: "swap"`, with a system fallback.
- Heading letter spacing still comes from the tone table in `look.md`.
- The accent font appears only on small labels, step numerals and prices, never on paragraphs.

## 2. Motif: choose one

The motif is drawn from what the product does. It is CSS and inline SVG only (no external images), appears in the hero and in at least one other section (a motif seen only in the hero is a hero picture, not a motif), and never sits behind body text at less than 4.5:1 contrast.

| Motif | How it looks | Good for |
|---|---|---|
| Board | rows and columns with thin rules, small status dots | scheduling, ops, project tools |
| Ledger | ruled lines, tabular numerals, quiet columns | finance, analytics, billing |
| Blueprint | fine dot or cross grid, thin technical lines | developer tools, infrastructure |
| Paper | warm off-white, soft shadows, ink-coloured text | writing, notes, knowledge tools |
| Terminal | mono labels, prompt-style marks, sharp corners | CLI, security, data |
| Soft mesh | blurred gradient shapes from the accent | creative, consumer, community |
| Bands | diagonal or stepped colour bands between sections | marketing, sales tools |
| Stack | two or three cards overlapping at a slight offset or tilt, each with a status chip, like a feed of items | products whose core is a list of items: picks, deals, listings, matches, tickets |

## 3. Hero: what the hero shows

The hero shows the product, not an empty box. Choose one (`heroKind`):

1. **frame**: a browser or device window (a top bar with three dots and a title) holding a picture of the product's main screen, built in HTML and CSS from the brief's description of the product.
2. **fragment**: a small piece of the product's interface composed in HTML and CSS from the site's own words, without a window around it. For a calendar tool, three post cards on a week strip; for a picks app, a stack of pick cards. It looks like the product without needing a screenshot.
3. **owner-art**: an image the owner supplied. Used as given, inside the same frame; never recoloured, redrawn or stretched. Once the owner supplies an image, `heroKind` becomes `owner-art`.

The hero has one of two layouts (`heroLayout`; the rules in numbers are in `look.md`, Hero):

1. **centred**: one centred stack, headline, line and buttons, with the preview below. Any hero kind.
2. **split**: on desktop, the text on the left and the fragment on the right; on a phone it stacks, the fragment below the main button. Only when `heroKind` is `fragment`. A frame or owner art always uses centred.

The rules for a frame or fragment (also in `look.md`, Hero):
- It carries a small visible label, **Concept preview**, because it is not the real product.
- Words in it come from the brief: the product name, its features, its steps, its plan names. Where the interface needs filler (a time, a date, an amount in a row, a status), it is short, plainly generic and inside a panel marked **Sample**.
- **No invented figures.** No user counts, percentages saved, ratings, revenue, growth, win rates or any number that reads as a claim about the product or its customers. A price shown in it is the price in the plan data.

## 4. Signature elements: choose one or two

One or two recognizable devices the whole site repeats:

- `oversized-numerals`: oversized numerals (steps, plan lengths)
- `headline-marker`: a recurring marker under key words in headlines
- `section-index`: section index labels (01, 02, 03) in the accent font
- `corner-ticks`: corner ticks on cards
- `status-chips`: status chips used the same way everywhere
- `bleed-grid-line`: a grid line that bleeds off the page edge

Use these names in `direction.signatures`. Benefit and use-case cards carry icons, never numerals, whatever the signatures (look.md, Icons for features, numerals for steps).

Each chosen element gets one class or token and is used the same way in at least three places. A signature that appears once is a decoration, not a signature.

## 5. References

If the brief has `look.references` or the owner named a site they like, learn only these from it: pace (how much per screen), density, contrast between headline and body, how the hero presents the product, how proof is shown, how motion is used. Record what you took in AGENT_LOG.md. Never copy its layout measurements, wording, logos, art or exact palette. A reference sets a direction, never a copy.

## 6. Plain-words changes

When the owner asks in everyday words, change `direction`, then rebuild the affected parts. Examples:

| The owner says | Change |
|---|---|
| "more editorial", "more refined" | Editorial pairing, Paper motif |
| "more technical", "more developer" | Grotesk and mono, or Sharp technical, with Blueprint or Terminal |
| "friendlier", "softer" | Soft geometric, Soft mesh |
| "punchier", "sportier", "louder" | Heavy geometric, with Stack or Bands |
| "less busy", "plainer" | keep the motif in the hero and one other section only, keep one signature element |
| "make it feel like <a site they name>" | add it as a reference, record what you learned, keep the quality floor |

## 7. Checks

Add these to the end-to-end tests with the `look.md` checks. They read the expected values from `direction` in `src/theme.ts`, never from copied text.

1. The computed font family of the first `h1` matches `direction.headingFont`, body text matches `direction.bodyFont`, and no more than three font families load on the page.
2. The computed font weight of the hero, section and closing headlines equals `direction.headingWeight`, and `direction.headingWeight` is the weight the pairing table declares for `direction.pairing` (for Neutral modern, the tone's display weight). No element other than a headline has a weight above 700, except numerals marked `data-signature="oversized-numerals"` when that signature is chosen, at most `direction.headingWeight`.
3. With `direction.capsLabels` true: the nav links, eyebrows and buttons have `text-transform: uppercase` and letter spacing of at least 0.08em, and no `h1` to `h3` or paragraph is uppercase.
4. The motif appears in the hero and in at least one other section (each marked with `data-motif`), and uses no external image.
5. Each signature element appears in at least three places with the same class or token.
6. Hero: with no owner image, the hero has a frame or fragment (`data-hero-kind` equal to `direction.heroKind`), the words "Concept preview" are visible in it, every panel with filler values carries a visible "Sample" label, and the hero holds no `img` that points at a file the owner did not supply. `data-hero-layout` equals `direction.heroLayout`, and it is `split` only when `direction.heroKind` is `fragment` (look.md check 33). With an owner image (set by the test itself in the content file), that image fills the same frame, its rendered ratio matches its natural ratio within 2%, and it has alt text.
7. Every check in `look.md` still passes.
8. Tests measure the rendered page (computed styles, boxes, screenshot samples). They never spell out text the owner can edit (headlines, button labels, prices, plan names, section headings, FAQ text); where a check needs that text, it reads it from `src/content/site.ts`.
