# Appnomics runner: instructions for Claude Code

The runner is the AI agent and the deploy script. In production it runs inside the Fly worker (`../appnomics-builder/worker`). Read `../appnomics-builder/ARCHITECTURE.md` first, then `README.md`.

## Commands
- `npm run check` (typecheck) and `npm test` must pass before you say a change is done. No API key is needed.
- `npm run create | change | resume | deploy | interview`: see README.
- A new test file must be added to the `test` script in `package.json`; it chains files by hand.

## Where things are
- `src/`: agent loop (`agent.ts`), tools and limits (`tools.ts`), cli, `deploy.ts`, `add-admin.ts` (restaurant owner area), `kind.ts` (which packs are static).
- `vertical-packs/<pack>/`: this is where pack truth lives (specs, interview, example brief; for restaurants also `reference/`). The Builder copies interviews and example briefs from here with `npm run sync:site-pack` (run it in the Builder and commit the result).
- Any change in this repo needs `fly deploy` from `~/appnomics` to reach production. Deploy only when no build is in flight.

## Rules from the owner (RP)
- Commit messages: plain words, no quotes, no apostrophes, no escapes.
- Never print, ask for or write keys, passwords or hashes. Names of variables only. A generated owner password is printed once by deploy on purpose; do not log it anywhere else.
- Nothing invented in a customer's site. The restaurant pack shows placeholders or leaves things out, and the Builder lists them in a check list.
- Restaurant sites go live static first. The owner area is stage two and is plain code, no model. Do not make the build agent write API routes or a database for the public site.
- Reference components are copied as written. Changing one changes every future site: add or update a test in `test/local-business.test.ts` and ask RP before new restaurant features.
- Deploy failure rules: before the final deploy, undo what you created (for example the new Neon project) and leave the live site alone; after it, keep the database and write `deploy.json`.
- Ideas not being built go in `PARKING_LOT.md`, not in code.
- Do not commit real restaurants' briefs, `runs/`, or `.env`.
