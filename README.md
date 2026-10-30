# Appnomics runner

Turns an idea and a brief into a built, tested app, and deploys it to a live address. It runs on your own machine with your own API keys.

    idea + brief
      -> fresh folder and fresh database
      -> the agent builds from the specs, running its own checks
      -> (sites) a second look pass applies the pack's look rules
      -> the runner runs typecheck and build itself and writes run.json
      -> optional: deploy to Neon + Vercel on a live subdomain

Two packs exist today:

| Pack | What it builds | State |
|---|---|---|
| `vertical-packs/site` | One-page waitlist website: hero, tools strip, preview, benefits, sign-up form, owner area for sign-ups | Built, deployed and tested end to end on one site |
| `vertical-packs/store` | Online store with owner area | Built and tested; deploy script is not yet mapped to its variable names |

## You need
- Node 22+ and git
- A local Postgres where your user can run `createdb` (set `RUNNER_DB_BASE_URL` if it is not `postgres://localhost:5432`)
- `ANTHROPIC_API_KEY` in your shell
- Playwright's browser for the end-to-end tests: `npx playwright install chromium`
- To deploy: `VERCEL_TOKEN` and `NEON_API_KEY` (see Deploy)

## Setup
    npm install
    npm test            # tool limits and the agent loop; no API key needed
    npm run check       # typecheck

## Commands

### Interview (site pack): turn a conversation into a brief
    npm run interview -- --pack site

Asks about 14 questions, states a default whenever you skip one, and saves `briefs/<name>.json`. It never overwrites an existing brief (it writes `-2`, `-3`). Cost cap: `INTERVIEW_MAX_COST_USD` (default 1).

### Create: build an app
    npm run create -- "A waitlist website for Mealwise" \
      --specs vertical-packs/site/specs --brief briefs/mealwise.json

`--specs` picks the pack. The default is the store pack, so pass the site specs for a site. For a site, a second look pass runs automatically after the main build. Skip it with `--no-look-pass` (put it after the prompt).

### Change: edit an existing run
    npm run change -- runs/<run-folder> "what to change"
    npm run change -- runs/<run-folder> --brief briefs/updated.json "apply the new brief"
    npm run change -- runs/<run-folder> --specs vertical-packs/site/specs "refresh the specs"

`--specs` refreshes the run's specs from the pack and keeps the run's own brief. Use plain words for the instruction; the agent reads the project log and changes only what you ask.

### Resume: continue a stopped build
    npm run resume -- runs/<run-folder>

### Deploy: put a run on a live address
    npm run deploy -- runs/<run-folder> --name mealwise --email owner@example.com
    npm run deploy -- runs/<run-folder> --set-password "a new password (10+ chars)"
    npm run deploy -- runs/<run-folder> --redeploy [--skip-migrate]

Creates a Neon database through its API, deploys from the folder with the Vercel CLI, and puts the site on `<name>.appnomics.live`. If no password is given, one is generated and printed once. Keep it; only a hash is stored.

Environment, read by the runner only (never written into the app folder):
- `VERCEL_TOKEN`, `NEON_API_KEY` (required)
- `VERCEL_SCOPE` (team slug), `NEON_ORG_ID`, `APP_DOMAIN` (default `appnomics.live`), `NEON_POOLED=0` (optional)

The app's own commands (migrate, seed, hash) run with a clean environment that has no tokens. Production env vars on Vercel are sensitive and cannot be pulled back, so the deploy state (including the Neon project id) is kept in `runs/<run>/deploy.json`. Keep that file; `--redeploy` needs it.

## Settings
| Variable | Default | What it does |
|---|---|---|
| `RUNNER_MODEL` | `claude-sonnet-5-5` | Model for builds |
| `RUNNER_MAX_COST_USD` | 15 | Stops a run that spends too much |
| `RUNNER_MAX_TURNS` | 150 | Stops a stuck run |
| `RUNNER_DB_BASE_URL` | `postgres://localhost:5432` | Where run databases are created |

Prices used for the cost estimate are in `src/config.ts`. In practice the estimate has run 14 to 20 percent above the billed amount. Check the Anthropic console for the real figure.

## Each run leaves, under runs/<id>/
- `app/` the built app (a git repo; the first commit is the specs and brief). Includes `AGENT_LOG.md`: what was built, choices on unclear points, what was not verified.
- `brief.json` the brief the build used
- `transcript.jsonl` every tool call, in order
- `run.json` stop reason, turns, tokens, estimated cost, typecheck and build results
- `deploy.json` after a deploy: name, host, Neon project, URL

Rough costs from real runs (site pack): a build is about $3 and 20 to 28 minutes; a look or copy change is about $0.40 to $1.50; an interview is about $0.30.

## Layout
    src/            runner: agent loop, tools, cli, deploy, interview
    vertical-packs/ site/ and store/: specs, example brief, interview questions
    briefs/         saved briefs (examples and your own)
    test/           tool and loop tests
    PARKING_LOT.md  ideas not being built now

A pack's `specs/` folder is the contract the agent builds against (vision, stack, requirements, experience, domain model, edges, and for sites `look.md`). It is read-only to the agent. The brief holds the facts for one app and overrides anything in the specs that is specific to one product.

## What this is not (yet)
- **Not a sandbox.** Tools keep the agent inside its folder and limit commands, which stops accidents. Run it on a machine where that is acceptable. A container per run comes later.
- **No approval step or live preview.** Deploys are a command you run.
- **Deploy covers the site pack.** Variable names (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`) are hard-coded; the store pack needs them mapped. Creating the Blob storage for image uploads is still a dashboard step, and verification does not sign in.
- **Operator-held keys.** Your own keys and accounts do the work. Customer-owned accounts come later.