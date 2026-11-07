# Creative direction layer (DRAFT, not wired in)

Four files, nothing here is read by the interview, the agent or the builder:

- `creative.md`: what the agent reads after `look.md` once the layer is wired in (typography pairings, motifs, hero kinds, signature elements, references, plain-words changes, checks).
- `creative.example.json`: the `creative` block that would sit in the brief.
- `interview-step.md`: the interview step where Scout proposes three directions.
- `uploads.md`: owner-supplied art (hero illustration, screenshots, logo) and what it needs.

## Why it is parked

The first measurement is a fresh build through the pack without this layer. The same product is then built again with it, so we know what the layer adds.

## To wire it in (about half a day)

1. Move `creative.md` into `specs/` and add one line to the agent prompt: read it right after `look.md`.
2. Add `creative` to `brief.example.json` and to `ShowcaseBrief` in the builder (optional block, so older briefs keep working).
3. Add the interview step, and show the chosen direction on the review screen and the brief card.
4. Add checks 1 to 6 of `creative.md` to `look.md`'s list.
5. Uploads are a separate piece: attach in chat, the `site_assets` table, and the worker copy.
