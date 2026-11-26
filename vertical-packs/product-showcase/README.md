# Product showcase pack

A showcase website for a software product (a home page first; more pages come later through Scout), built fast from a short interview. No sign-ups, no database, no owner area, no email. Hero with a main button (a link the owner sets) and a concept preview of the product built in HTML, benefits bento, how it works, pricing (up to three plans, optional yearly billing), testimonials, FAQ, closing call to action and a full footer. Optional: examples gallery, comparison table, use-case cards.

The brand is the part to get right: audience, tone (calm, bold, playful, serious) and color (light or dark, plus a main colour from a short list) are asked in the interview. Tone changes the design as well as the words: `specs/look.md` turns tone, mode and accent into numbers (type, shape, accent use, a true bento grid, a scrolling testimonials row, motion).

Honesty rules: drafted copy comes from the interview; sample content (testimonials, pricing the owner has not given, the hero image, links with no page) is clearly marked "Sample" and listed in the brief's `placeholders`. Nothing about customers, certifications or security is invented.

The earlier version of this pack, with email sign-ups, a database and an owner area, is kept in `parked/saas-signup-owner-v1` for the app packs that need those parts (waitlist, creator, coaching).

Status: interview, brief, contract and specs are written for this pack. Not yet done: the runner's no-database deploy mode, the builder and worker wiring, and a first test build.

The look comes from two files: `specs/look.md` (spacing, contrast, depth and checks) and `specs/creative.md` (the direction the agent chooses for each product: font pairing, motif, hero kind and signature elements, recorded in the site's `src/theme.ts` and in AGENT_LOG.md). When the Builder passes the Visual design tokens (`--theme`), the runner writes `src/theme.ts` before the agent starts, with `tokens` and a filled-in `direction`, and the agent starts from them.

`direction.json` holds the same closed lists (pairings, motifs, hero kinds, hero layouts, signature names) for code. The Builder copies it with `npm run sync:site-pack` and checks the design brief's choices against it (APP-42). A test fails if it and `creative.md` differ.

The design brief (APP-42): the Builder's worker writes it from the interview before each build and passes it with `--design-brief`. It lands in the run as `specs/design-brief.md`, and the agent reads it right after `creative.md`. A build without one works as before.
