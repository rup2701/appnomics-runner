# Creative direction: what makes this product's site look like itself

DRAFT. Not read by the agent yet. When it is wired in, this file is copied next to `look.md` and read right after it.

`look.md` is the execution layer: spacing, contrast, depth, checks. This file is the direction layer. It decides what is distinctive about this product. The two never conflict: **every `look.md` check still passes whatever direction is chosen.** Direction changes the character, never the quality floor.

The direction comes from the brief's `creative` block (see `creative.example.json`). If the block is missing, build from `look.md` alone, as before.

## 1. Typography identity

Choose from this list only. All of them load through `next/font/google`, so a build never depends on a font that fails to load.

| Direction name | Headings | Body | Accent (labels, numerals) | Fits |
|---|---|---|---|---|
| Neutral modern | Inter | Inter | none | calm, serious |
| Grotesk and mono | Space Grotesk | Inter | JetBrains Mono | bold, technical products |
| Editorial | Fraunces | Inter | none | calm, premium, writing-led products |
| Soft geometric | Plus Jakarta Sans | Plus Jakarta Sans | none | playful, friendly |
| Sharp technical | IBM Plex Sans | IBM Plex Sans | IBM Plex Mono | serious, developer-facing |
| Display contrast | Sora | Inter | none | bold, confident |

Rules:
- At most two families plus one mono accent. Load only the weights used, `display: "swap"`, with a system fallback.
- Heading letter spacing and weight still come from the tone table in `look.md`.
- The accent font appears only on small labels, step numerals and prices, never on paragraphs.

## 2. Visual concept

One sentence in the brief (`creative.concept`) says what the site looks like and why it fits the product, and one motif carries it. The motif is drawn from what the product does. Choose one:

| Motif | How it looks | Good for |
|---|---|---|
| Board | rows and columns with thin rules, small status dots | scheduling, ops, project tools |
| Ledger | ruled lines, tabular numerals, quiet columns | finance, analytics, billing |
| Blueprint | fine dot or cross grid, thin technical lines | developer tools, infrastructure |
| Paper | warm off-white, soft shadows, ink-coloured text | writing, notes, knowledge tools |
| Terminal | mono labels, prompt-style marks, sharp corners | CLI, security, data |
| Soft mesh | blurred gradient shapes from the accent | creative, consumer, community |
| Bands | diagonal or stepped colour bands between sections | marketing, sales tools |

The motif is CSS and inline SVG only (no external images), appears in the hero and in at least one other section, and never sits behind body text at less than 4.5:1 contrast.

## 3. Hero art direction

How the product is shown in the hero. Choose one (`creative.hero.kind`):

1. **frame**: a browser or device frame holding a placeholder screenshot. The frame is built in code; the placeholder says "Your product screenshot goes here".
2. **fragment**: a small piece of the product's interface composed in code from the site's own words (for a calendar tool, three post cards on a week strip). It looks like the product without needing a screenshot. Everything in it is marked Sample.
3. **diagram**: an inline SVG of how the product works, built from the "how it works" steps.
4. **type**: no image. A very large headline, the main button, and the motif as the only decoration.
5. **owner art**: an illustration or image the owner uploaded (see `uploads.md`). Used as given; never recoloured, redrawn or stretched.

Rules for all: the hero image area keeps the 16:10 slot from the brief, loads without layout shift, has alt text, and never pushes the main button below the first screen on a 390 px wide phone.

## 4. Signature elements

One or two recognizable devices the whole site repeats. Choose from:

- oversized numerals (benefit cards, steps)
- a recurring marker under key words in headlines
- section index labels (01, 02, 03) in the accent font
- corner ticks on cards
- status chips used the same way everywhere
- a grid line that bleeds off the page edge

Each chosen element gets one class or token and is used the same way in at least three places. A signature that appears once is a decoration, not a signature.

## 5. Reference interpretation

The owner may give one or two reference sites (`creative.references`). From each, record in `creative.learned` what to learn, using only these categories: pace (how much per screen), density, contrast between headline and body, how the hero presents the product, how proof is shown, how motion is used. Do not record or copy layout measurements, exact wording, logos, or a reference's exact palette. A reference sets a direction, never a copy.

## 6. Plain-words changes

When the owner asks in everyday words, change the direction fields, then rebuild the affected parts. Examples:

| The owner says | Change |
|---|---|
| "more editorial", "more refined" | Editorial pairing, Paper motif |
| "more technical", "more developer" | Grotesk and mono, or Sharp technical, with Blueprint or Terminal |
| "friendlier", "softer" | Soft geometric, Soft mesh |
| "less busy", "plainer" | remove the motif from every section except the hero, keep one signature element |
| "make it feel like <a site they name>" | add it as a reference, rewrite `learned`, keep the quality floor |

## 7. Checks

1. The computed font family of the first `h1` matches `creative.typography.heading`, and body text matches `creative.typography.body`. No more than three font families load on the page.
2. The motif appears in the hero and in at least one other section, and uses no external image.
3. Each signature element appears in at least three places with the same class or token.
4. The hero matches `creative.hero.kind`. A frame, fragment, diagram or owner image has alt text and an aspect ratio of 16:10 within 2%; an owner image is not stretched (its rendered ratio matches its natural ratio within 2%).
5. Every check in `look.md` still passes.
6. Tests measure the rendered page (computed styles, screenshot samples), never only the brief's fields.
