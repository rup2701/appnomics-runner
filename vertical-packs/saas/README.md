# SaaS product showcase pack (DRAFT, not wired into the builder yet)

A showcase website for a software product (a home page first; more pages come later through Scout), built fast from a short interview. No sign-ups, no database, no owner area, no email. Hero with a main button (a link the owner sets) and a product image placeholder, benefits bento, how it works, pricing (up to three plans, optional yearly billing), testimonials, FAQ, closing call to action and a full footer. Optional: examples gallery, comparison table, use-case cards.

The brand is the part to get right: audience, tone (calm, bold, playful, serious) and color (light, dark, blue accent) are asked in the interview. Tone changes the design as well as the words: `specs/look.md` turns tone, mode and accent into numbers (type, shape, accent use, a true bento grid, a scrolling testimonials row, motion).

Honesty rules: drafted copy comes from the interview; sample content (testimonials, pricing the owner has not given, the hero image, links with no page) is clearly marked "Sample" and listed in the brief's `placeholders`. Nothing about customers, certifications or security is invented.

The earlier version of this pack, with email sign-ups, a database and an owner area, is kept in `parked/saas-signup-owner-v1` for the app packs that need those parts (waitlist, creator, coaching).

Status: interview, brief, contract and specs are written for this pack. Not yet done: the runner's no-database deploy mode, the builder and worker wiring, and a first test build.
