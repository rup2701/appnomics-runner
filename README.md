# Appnomics runner (first slice)

Turns one sentence into a built store, on your own machine, using your own API key.

    "I want to sell my paintings online"
      -> stand-in writes brief.json
      -> fresh folder + fresh database
      -> agent builds from the specs, runs its checks, writes AGENT_LOG.md
      -> runner runs typecheck and build itself and writes run.json (time, tokens, estimated cost)

## You need
- Node 22+, git
- A local Postgres where your user can run `createdb` (set RUNNER_DB_BASE_URL if it is not postgres://localhost:5432)
- `ANTHROPIC_API_KEY` in your shell
- Playwright's browser if the agent runs end-to-end tests: `npx playwright install chromium`

## Run
    npm install
    npm test                                   # checks the tool limits and the loop; no API key needed
    export ANTHROPIC_API_KEY=...
    npm run create -- "I want to sell my paintings online"

Optional: `--brief file.json` uses your own brief and skips the stand-in. `--specs dir` uses other specs.
Caps: `RUNNER_MAX_COST_USD` (default 15) and `RUNNER_MAX_TURNS` (default 150) stop a stuck run.

## Each run leaves, under runs/<id>/
- app/            the built store (a git repo; the first commit is the specs and brief)
- brief.json      what the stand-in wrote, with its assumptions
- transcript.jsonl every tool call, in order
- run.json        stop reason, turns, tokens, estimated cost, typecheck and build results

## What this is not (yet)
- Not a sandbox. Tools keep the agent inside its folder and limit commands, which stops accidents. Run it on a machine where that is acceptable. Real isolation (a container per run) comes later.
- Not a preview or deploy. There is no GitHub, Vercel or approval step yet.
- Not run end to end against the real model as of writing. The first real run is the first test of the prompt.
# appnomics-runner
