# Reference components: restaurant_001

Copy into the generated app, and use as written:

| From | To |
| --- | --- |
| `lib/content.ts` | `src/lib/content.ts` |
| `components/*.tsx` | `src/components/restaurant/` |
| `styles/restaurant.css` | `src/styles/restaurant.css`, imported once in the root layout |

Then write `src/content/site.ts` (a `Content` object from the brief) and render `<RestaurantPage c={content} />` from `src/app/page.tsx`. Set `--font-heading` and `--font-body` from `next/font`, and `--accent-text` when the accent is light.

`lib/content.ts` holds every rule about what is drawn (`visibleSections`, `pickHighlights`, `reserveMode`, `waysToOrder`, `galleryTiles`, `priceText`, `safeHref`). It has no React in it so it can be tested alone; the tests are `test/local-business.test.ts` in the runner. Do not reimplement these rules in a component.

The only client code is `PageBehaviour.tsx` (top bar shadow and the slim reserve bar). Icons are four inline SVGs in `Icon.tsx`; an app with lucide-react can swap them for CalendarCheck, PartyPopper, Truck and BookOpen.

Mapping from the website reader's result to `Content` (the brief step does this): `menu[].category` becomes `categories[].name`; `actions` with labels matching reserv or book, order, cater and menu become `links`; `about`, `hours`, `address`, `phone`, `email` carry over; `images` with non-empty alt text become `gallery`; extras from the catering page become `catering.features`, cut before any copyright line. `usePhotos` stays false until the brief records `images.owner_confirmed`.
