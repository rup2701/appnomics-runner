# Local business pack

A website for a neighbourhood business (home, /menu, /story), restaurant first, built from what the owner's own website already says. It goes live **static**: no database, no API routes. A table request form posts to the Builder, which emails the owner. After it is live, **stage two** adds an owner area with its own database (menu spreadsheet, table requests); see below.

Design: `restaurant_001` ("Marina clean card"), taken from a restaurant page built by hand and turned into reusable components. See `reference/README.md`.

Run it:

    RUNNER_MAX_COST_USD=10 npm run create -- "A website for my Indian and Nepalese restaurant" \
      --specs vertical-packs/local-business/specs --brief briefs/<restaurant>.json

The brief's `site.kind` is `local-business`, which the runner treats as a static site (see `src/kind.ts`).

Files: `specs/` has contract.md, stack.json, requirements.json (12 features), experience.json, domain-model.json, edges.json (27 edges, L-001 to L-027), look.md and SPEC_GAPS.md. `reference/` has the components, the display rules (`lib/content.ts`) and the stylesheet. `brief.example.json` shows the brief's shape with made-up values.

Status (14 Nov 2026): the pack is built and used for real. Template mode (empty sections become placeholders and a check list, nothing invented), the interview and the website-reader step are wired into the Builder; stage two is built and tested, including a real run on one restaurant. Fonts are Vollkorn and DM Sans through `reference/lib/fonts.ts`. Old restaurant sites have no owner area until rebuilt. Next ideas (layout as data, a salon pack) are in `PARKING_LOT.md`.

## Stage two: owner area

`src/add-admin.ts` copies `reference/admin/` into the finished app and switches the menu and requests to read from a database. It is plain code; no model runs. `npm run deploy -- runs/<run> --add-database --email <owner>` then creates a Neon project for the site, migrates, sets production settings, deploys and checks `/admin/login`. In production the worker queues this as a `site_admin` job after the site is live. Switch it off with `WORKER_RESTAURANT_ADMIN=off`.

Before changing the owner area, run `npm test` (the `restaurant-admin` and `local-business` tests). The reference components are copied as written, so a change there reaches every site built afterwards, and needs `fly deploy`.

## Interview

`interview/questions.json` lists what to ask the owner after the website is read (story, reviews, signature dishes, booking link, email, social links, hours, prices, and owner confirmation). `interview/interview.ts` has two pure functions: `nextQuestions(brief, state)` returns the one or two questions that matter most now (never one already asked or skipped), and `applyAnswer(brief, id, answer)` checks an answer and writes it into a copy of the brief. Code chooses the question and checks the answer; the model only words the question using `renderAsk`. Scout calls these through its interview tools. The field paths are kind-neutral so a salon or other kind can reuse the format.
