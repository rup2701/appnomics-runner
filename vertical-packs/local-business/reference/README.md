# Reference components: restaurant_001

Copy into the generated app, and use as written:

| From | To |
| --- | --- |
| `lib/content.ts` | `src/lib/content.ts` |
| `components/*.tsx` | `src/components/restaurant/` |
| `styles/restaurant.css` | `src/styles/restaurant.css`, imported once in the root layout |
| (new file, one line) | `src/components/lib/content.ts` containing `export * from "../../lib/content";` |

The components import `../lib/content`, which from `src/components/restaurant/` is `src/components/lib/content`. The one-line file above makes that import work, so the components stay byte-identical to the reference. Do not edit the components' imports.

Then write `src/content/site.ts` (a `Content` object from the brief) and render `<RestaurantPage c={content} />` from `src/app/page.tsx`, `<MenuPage c={content} />` from `src/app/menu/page.tsx` (404 unless `hasMenu`) and `<StoryPage c={content} />` from `src/app/story/page.tsx` (404 unless `hasStory`). `Shell.tsx` is the frame all three share. Set `--font-heading` and `--font-body` from `next/font`, and `--accent-text` when the accent is light.

`lib/content.ts` holds every rule about what is drawn (`visibleSections`, `pickHighlights`, `reserveMode`, `waysToOrder`, `galleryTiles`, `priceText`, `safeHref`). It has no React in it so it can be tested alone; the tests are `test/local-business.test.ts` in the runner. Do not reimplement these rules in a component.

The only client code is `PageBehaviour.tsx` (top bar shadow and the slim reserve bar) and `ReserveForm.tsx` (the table request form, drawn only in request mode). Icons are four inline SVGs in `Icon.tsx`; an app with lucide-react can swap them for CalendarCheck, PartyPopper, Truck and BookOpen.

Mapping from the website reader's result to `Content` (the brief step does this): `menu[].category` becomes `categories[].name`; `actions` with labels matching reserv or book, order, cater and menu become `links`; `story` (from a page the site titles story or journey, cut before any copyright line; absent when the site has none), `about`, `hours`, `address`, `phone`, `email` carry over; `images` with non-empty alt text become `gallery`; extras from the catering page become `catering.features`, cut before any copyright line. `usePhotos` stays false until the brief records `images.owner_confirmed`.

## Owner area and database (stage two): `admin/`

Everything in `admin/` is NOT copied by the build agent. A restaurant build ends with a static public site (no database, no API routes). Once that site is live, stage two adds the owner area to the finished site with `src/add-admin.ts` (plain file copies and small text patches, no model), then `deploy.ts` creates the site's own Neon database, sets the sign-in variables and redeploys. The public site is never touched by a failed attempt.

| From (`admin/`) | To (in the site) |
| --- | --- |
| `server/*.ts` | `src/lib/` (database, sign-in, menu store, table requests, spreadsheet reader, `getContent()`) |
| `app/**` | `src/app/` (`/admin/*`, `/api/admin/*`, `/api/reserve`) |
| `admin.css` | `src/styles/admin.css` |
| `db/*.sql` | `drizzle/` (applied by `scripts/migrate.mjs`, safe to run twice) |
| `scripts/*.mjs` | `scripts/` (`db:migrate` and `hash-password`, the names the deploy script runs) |
| (generated) | `src/lib/baked.ts` re-exporting the site's own content as `baked` |

`add-admin.ts` also patches the three pages (`page.tsx`, `menu/page.tsx`, `story/page.tsx`) so they read `await getContent()` and refresh every 60 seconds, and adds `postgres` and `fflate` and the two scripts to `package.json`. Without `DATABASE_URL` every owner route answers 404 and `getContent()` returns the built-in content, so the same code is safe on a site with no database.

What the owner area does: `/admin/menu` edits sections and dishes (price, description, hide, order) and takes a spreadsheet (replace, or add what is missing, with a preview first); `/admin/requests` lists table requests with new, confirmed and declined. The public menu comes from the database, with the built-in menu as the fallback if the database cannot be reached. Table requests post to the site's own `/api/reserve` once the database exists.

The tests are `test/restaurant-admin.test.ts` (SQL and rules against an in-memory Postgres, and `add-admin`).
