# Open points in the SaaS product site pack

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

## Open points in the SaaS pack

| # | Gap | Default in this version |
| --- | --- | --- |
| 1 | An owner screen for editing the page | Not built on purpose. Changes are made by asking the builder; a post-launch change job is planned. |
| 2 | Sending email (confirmation, a note to the owner) | Not built. Emails are stored and downloaded. |
| 3 | Real images and logos | Placeholders and an HTML product mock-up; the owner adds images later. |
| 4 | Checkout or payments | Not built. Pricing buttons scroll to the email box. |
| 5 | Visit analytics | Not built. Only sign-ups, their source and which box was used are counted. |
| 6 | Custom domain | Not built. The site uses the address the host assigns. |
| 7 | Legal pages (privacy, terms) | Not written by the builder. Links appear only if the owner supplies URLs. |
