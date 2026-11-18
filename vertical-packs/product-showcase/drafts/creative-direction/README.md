# Creative direction layer (partly wired in)

The direction layer is live in its smaller form: `specs/creative.md` (moved from here). The build agent chooses the font pairing, motif, hero kind and signature elements from the product, and records them in the site's `src/theme.ts` (`direction`) and in AGENT_LOG.md. Scout does not ask about them yet (APP-39).

Still parked here:

- `creative.example.json`: a `creative` block for the brief, for when Scout proposes directions.
- `interview-step.md`: the interview step where Scout proposes three directions.
- `uploads.md`: owner-supplied art (hero illustration, screenshots, logo) and what it needs.

## To wire in the rest

1. Add `creative` to `brief.example.json` and to `ShowcaseBrief` in the builder (optional block, so older briefs keep working). When the brief has it, the agent follows it instead of choosing.
2. Add the interview step, and show the chosen direction on the review screen and the brief card.
3. Uploads are a separate piece: attach in chat, the `site_assets` table, and the worker copy.
