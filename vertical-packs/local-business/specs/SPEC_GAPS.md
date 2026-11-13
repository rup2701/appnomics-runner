# Open points in the local business pack

These are known gaps, not mistakes. The builder records its own choices in AGENT_LOG.md.

| # | Gap | Default in this version |
| --- | --- | --- |
| 1 | Booking tables inside the page | A table REQUEST form (day, time, guests, name, phone or email) when the builder gives the site an address to send it to. The owner is emailed and confirms by phone or email. Nothing checks which tables are free, and there is no owner screen for requests yet. The owner's own booking link, when there is one, always wins. |
| 2 | Online ordering and payments | Not built. Order online opens the restaurant's own ordering page. |
| 3 | A screen for editing the menu and hours | Not built on purpose. Changes are made by asking Scout. |
| 4 | Pictures from JavaScript-built galleries | The website reader sees only pictures present in the page source. The owner can send pictures later. |
| 5 | A picture address that fails to load | Not handled (edge L-014). |
| 6 | Dish descriptions and dietary marks (vegan, spicy) | Shown only when the owner's site has them. Not invented. |
| 7 | Hours that change by day, holidays and "closed today" | Shown as the owner's lines of text. No live open or closed state. |
| 8 | Several locations, other languages | Not built. |
| 9 | Business kinds other than a restaurant (salon, clinic, shop) | Not built. The pack is named local-business so they can be added as new designs. |
| 10 | Accent contrast | The reference defaults text on the accent to white. The agent sets --accent-text for light accents (edge L-024). |
| 11 | Acceptance checks as executable tests in the generated app | The display rules are tested in the runner (test/local-business.test.ts). The builder writes the Playwright checks, one per edge. |
