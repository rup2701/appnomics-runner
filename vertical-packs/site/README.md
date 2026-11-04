# Waitlist site pack

A lean spec pack for a one-page website that tests an idea by collecting sign-ups.

Run it:

    RUNNER_MAX_COST_USD=10 npm run create -- "A waitlist website for Ksandra" \
      --specs vertical-packs/site/specs --brief briefs/ksandra.json

Files in specs/: contract.md, stack.json, requirements.json, experience.json, domain-model.json, edges.json (32 edges, W-001 to W-032), SPEC_GAPS.md. The brief is the facts for one site (see briefs/ksandra.json).
