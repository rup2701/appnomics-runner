# Appnomics runner

Turns an idea and a brief into a built, tested site or app and deploys it to a live address. In production it runs inside the worker on Fly (see `../appnomics-builder/ARCHITECTURE.md`); you can also run it by hand on your own machine with your own keys.

    brief
      -> fresh folder (runs/<id>/app) and, for packs that need one, a fresh database
      -> the agent builds from the pack's specs, running its own checks
      -> (sites) a second look pass applies the pack's look rules
      -> the runner runs typecheck and build itself and writes run.json
      -> deploy to Vercel (and Neon where the pack has a database) on <name>.appnomics.live

## Packs
A pack is a kind of site. `vertical-packs/<pack>/specs/` is the contract the agent builds against (read-only to the agent). The brief holds the facts for one site and overrides anything product-specific in the specs.

| Pack | Builds | Deploy |
|---|---|---|
| `site` | Waitlist website with an owner area for sign-ups | Neon database + Vercel. Tested end to end |
| `product-showcase` | Website for an existing product | Static, Vercel only |
| `local-business` | Restaurant website (home, /menu, /story) from reference components | Static first. Owner area and own database added afterwards with `--add-database` |
| `store` | Online store with owner area | Built and tested; deploy is not mapped to its variable names |

Which packs are static is decided in `src/kind.ts`. The restaurant pack has its own README with details.

## You need
- Node 22+ and git
- A local Postgres where your user can run `createdb` (set `RUNNER_DB_BASE_URL` if it is not `postgres://localhost:5432`). On Fly the image provides one.
- `ANTHROPIC_API_KEY` in your shell
- Playwright's browser for end-to-end tests: `npx playwright install chromium`
- To deploy: `VERCEL_TOKEN` and `NEON_API_KEY`

## Setup
    npm install
    npm test         # all runner tests; no API key needed
    npm run check    # typecheck

## Commands

### Interview: turn a conversation into a brief
    npm run interview -- --pack site

Asks the pack's questions, states a default whenever you skip one, and saves `briefs/<name>.json` (never overwrites; it writes `-2`, `-3`). Cost cap `INTERVIEW_MAX_COST_USD` (default 1).

### Create
    npm run create -- "A waitlist website for Mealwise" \
      --specs vertical-packs/site/specs --brief briefs/mealwise.json

`--specs` picks the pack; the default is the store pack. Sites run a look pass afterwards; skip it with `--no-look-pass` (after the prompt). Restaurant example:

    RUNNER_MAX_COST_USD=10 npm run create -- "A website for my restaurant" \
      --specs vertical-packs/local-business/specs --brief briefs/<restaurant>.json

### Change
    npm run change -- runs/<run> "what to change"
    npm run change -- runs/<run> --brief briefs/updated.json "apply the new brief"
    npm run change -- runs/<run> --specs vertical-packs/site/specs "refresh the specs"

`--specs` refreshes the run's specs and keeps its own brief.

### Resume
    npm run resume -- runs/<run>

### Deploy
    npm run deploy -- runs/<run> --name mealwise --email owner@example.com
    npm run deploy -- runs/<run> --set-password "a new password (10+ chars)"
    npm run deploy -- runs/<run> --redeploy [--skip-migrate]
    npm run deploy -- runs/<run> --add-database --email owner@example.com    # restaurant sites, after they are live

The first deploy creates the Neon database (waitlist sites), deploys with the Vercel CLI and puts the site on `<name>.appnomics.live`. Static sites skip the database. `--add-database` creates a database for a live static restaurant site, adds the owner area, deploys again and checks the sign-in page; on failure before the final deploy it removes the new database and leaves the live site untouched. If no password is given one is generated and printed once; only a hash is stored. Private test deploys are supported (see `test/private-deploy.test.ts`).

Environment, read by the runner only (never written into the app folder):
- `VERCEL_TOKEN`, `NEON_API_KEY` (required)
- `VERCEL_SCOPE`, `NEON_ORG_ID`, `APP_DOMAIN` (default `appnomics.live`), `NEON_POOLED=0` (optional)

The app's own commands (migrate, seed, hash) run with a clean environment that has no tokens. Production env vars on Vercel cannot be pulled back, so state lives in `runs/<run>/deploy.json` (name, host, Neon project, URL). Keep it; redeploys need it.

## Settings
| Variable | Default | What it does |
|---|---|---|
| `RUNNER_MODEL` | `claude-opus-5-5` | Model for builds. Set it to `claude-sonnet-5-5` for a cheaper build |
| `RUNNER_CHANGE_MODEL` | `claude-sonnet-5-5` | Model for site changes (`change`), so quick edits stay quick and cheap |
| `RUNNER_MAX_COST_USD` | 15 | Stops a run that spends too much |
| `RUNNER_MAX_TURNS` | 150 | Stops a stuck run |
| `RUNNER_DB_BASE_URL` | `postgres://localhost:5432` | Where run databases are created |

Prices for the cost estimate are in `src/config.ts`, one row per model. A model not listed there is priced as Opus. The estimate has run 14 to 20 percent above the billed amount.

## Each run leaves, under runs/<id>/
- `app/` the built app (a git repo; first commit is the specs and brief), with `AGENT_LOG.md`: what was built, choices, what was not verified
- `brief.json`, `transcript.jsonl` (every tool call), `run.json` (stop reason, turns, tokens, cost, typecheck and build results), `deploy.json`

Rough costs from real runs: a full build about $8.40 on Opus 5.5 and $4.60 on Sonnet 5.5 (the same brief, November 2026); a look or copy change $0.40 to $1.50; an interview about $0.30.

## Layout
    src/              agent loop, tools, cli, deploy, add-admin, interview, kind
    vertical-packs/   one folder per pack: specs, brief.example.json, interview, (restaurant) reference
    briefs/           example briefs. Real restaurants' briefs are not committed
    test/             tests
    parked/           shelved work
    PARKING_LOT.md    ideas not being built now

## What this is not (yet)
- Not a sandbox. Tools keep the agent inside its folder and limit commands, which stops accidents, not attacks. A machine per build comes before strangers use it.
- Operator-held keys. Your own accounts do the work; customer-owned accounts come later.
- Store deploy is not mapped, and Blob storage for image uploads is a dashboard step.
