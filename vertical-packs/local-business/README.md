# Local business pack

A one page website for a neighbourhood business, restaurant first, built from what the owner's own website already says. Static: no database, no owner area, no email. Changes go through Scout.

Design: `restaurant_001` ("Marina clean card"), taken from a restaurant page built by hand and turned into reusable components. See `reference/README.md`.

Run it:

    RUNNER_MAX_COST_USD=10 npm run create -- "A website for my Indian and Nepalese restaurant" \
      --specs vertical-packs/local-business/specs --brief briefs/<restaurant>.json

The brief's `site.kind` is `local-business`, which the runner treats as a static site (see `src/kind.ts`).

Files: `specs/` has contract.md, stack.json, requirements.json (12 features), experience.json, domain-model.json, edges.json (27 edges, L-001 to L-027), look.md and SPEC_GAPS.md. `reference/` has the components, the display rules (`lib/content.ts`) and the stylesheet. `brief.example.json` shows the brief's shape with made-up values.

Status: specs, reference components and display-rule tests are written, and the components have been rendered with a real restaurant's website-reader result (desktop and phone, with and without prices, pictures, reviews and links). Not yet done: a full agent build from this pack, the Builder and worker wiring (template choice, embedding the pack), the interview, and the step that turns the website reader's result into this brief.
