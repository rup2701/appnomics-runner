# Open points in the waitlist site pack

These are known gaps, not mistakes. The builder records its own choices in AGENT_LOG.md.

| # | Gap | Default in this version |
| --- | --- | --- |
| 1 | Sending email (confirmation, a note to the owner, double opt-in) | Not built. Sign-ups are stored and downloaded. |
| 2 | Unsubscribe link for visitors | Not built. The owner deletes a signup on request. |
| 3 | Visit analytics (page views, conversion rate) | Not built. Only sign-ups and their source are counted. |
| 4 | Custom domain | Not built. The site uses the address the host assigns. |
| 5 | Extra blocks (FAQ, how it works, real testimonials) | The data model has room for them. The default page does not include them unless the brief asks. |
| 6 | Multiple languages | Not built. |
| 7 | A/B tests of headlines | Not built. |
| 8 | Acceptance checks as executable tests | The `verification` arrays are prose. The builder writes the Playwright checks, one per edge. |
