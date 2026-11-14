// The display rules of the local-business reference: what is drawn, and what is never invented.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requestEndpoint, firstParagraph, galleryTiles, hasMenu, hasStory, menuHref, navLinks, pickHighlights, priceText, reserveMode, safeHref, stars, visibleSections, waysToOrder, footerColumns, highlightCards, type Content } from "../vertical-packs/local-business/reference/lib/content.js";
import { isStaticBrief } from "../src/kind.js";
import { createWorkspace } from "../src/workspace.js";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dishes = ["Kale Chat", "Chicken Pakoda", "Chili Chicken", "Lentil Soup", "Himalayan Noodle Soup", "Organic Green Mix Salad", "Samosa"];
const base = (over: Partial<Content> = {}): Content => ({
  name: "Test Kitchen",
  contact: { address: "1 Test St", phone: "510-555-0100", hours: ["Open daily 10 to 10"] },
  links: { reserve: "https://example.com/reserve", order: "https://example.com/order", catering: "https://example.com/catering", delivery: [] },
  about: { body: "We cook food." },
  menu: { showPrices: true, categories: [{ name: "Starters", items: dishes.map((n, i) => ({ name: n, price: i === 6 ? undefined : `$${10 + i}` })) }], highlights: [] },
  gallery: dishes.map((n) => ({ src: `https://example.com/${n}.jpg`, alt: n })),
  usePhotos: true,
  catering: { heading: "Catering", features: [{ title: "Events", body: "We cater." }] },
  testimonials: [],
  socials: [],
  off: [],
  accent: "#c2410c",
  ...over,
});

// Prices: shown when allowed and stated; never filled in; hidden with one switch.
assert.equal(priceText({ name: "A", price: "$5" }, true), "$5");
assert.equal(priceText({ name: "A", price: "$5" }, false), undefined);
assert.equal(priceText({ name: "A" }, true), undefined);
assert.equal(priceText({ name: "A", price: "  " }, true), undefined);

// Links: https, mailto and tel only.
assert.equal(safeHref("https://a.com"), "https://a.com");
assert.equal(safeHref("javascript:alert(1)"), undefined);
assert.equal(safeHref("#"), undefined);
assert.equal(safeHref("http://a.com"), undefined);
assert.equal(safeHref(undefined), undefined);

// Reserve: a real link, else the phone, else nothing. Never a form that does nothing.
assert.equal(reserveMode(base()).mode, "link");
assert.equal(reserveMode(base({ links: { delivery: [] } })).mode, "phone");
assert.equal(reserveMode(base({ links: { delivery: [] }, contact: { hours: [] } })).mode, "none");
assert.equal(reserveMode(base({ links: { reserve: "javascript:x", delivery: [] }, contact: { phone: "12", hours: [] } })).mode, "none");
// Request mode: the table request form, only with an https endpoint, and the owner's own link always wins.
const EP = "https://builder.example/api/reserve/11111111-2222-3333-4444-555555555555";
assert.equal(reserveMode(base({ links: { delivery: [] }, reservations: { endpoint: EP } })).mode, "request");
assert.equal(reserveMode(base({ links: { delivery: [] }, reservations: { endpoint: EP } })).label, "Request a table");
assert.equal(reserveMode(base({ links: { delivery: [] }, reservations: { endpoint: EP } })).href, "/#reserve");
assert.equal(reserveMode(base({ reservations: { endpoint: EP } })).mode, "link", "the owner's own booking link wins over the form");
assert.equal(reserveMode(base({ links: { delivery: [] }, reservations: { endpoint: "http://builder.example/x" } })).mode, "phone", "an http endpoint is ignored");
assert.equal(reserveMode(base({ links: { delivery: [] }, reservations: { endpoint: "javascript:alert(1)" } })).mode, "phone");
assert.equal(reserveMode(base({ links: { delivery: [] }, contact: { hours: [] }, reservations: { endpoint: EP } })).mode, "request", "the form needs no phone");
assert.equal(requestEndpoint(base()), undefined);
assert.equal(requestEndpoint(base({ reservations: { endpoint: `  ${EP}  ` } })), EP);
assert.equal(requestEndpoint(base({ reservations: { endpoint: "https://a b" } })), undefined);

// Highlights: pictures belong to a dish only when the alt text is the dish name and pictures are allowed.
let h = pickHighlights(base());
assert.equal(h.length, 6);
assert.ok(h.every((d) => d.image));
h = pickHighlights(base({ usePhotos: false }));
assert.equal(h.length, 0, "without permission and without pins there are no highlights");
h = pickHighlights(base({ usePhotos: false, menu: { showPrices: true, categories: base().menu.categories, highlights: ["Samosa", "Lentil Soup", "Nope"] } }));
assert.deepEqual(h.map((d) => d.name), ["Samosa", "Lentil Soup"], "pinned names first, unknown names ignored");
assert.ok(h.every((d) => !d.image));
h = pickHighlights(base({ gallery: [{ src: "https://x/1.jpg", alt: "Kale Chat but longer" }] }));
assert.ok(h.every((d) => !d.image), "an alt that only contains the name is not a match");

// Sections: nothing real, nothing drawn.
assert.deepEqual(visibleSections(base()), ["hero", "highlights", "menu", "about", "gallery", "catering", "ways", "footer"]);
assert.ok(!visibleSections(base()).includes("reviews"), "no testimonials, no reviews section");
assert.ok(visibleSections(base({ testimonials: [{ quote: "Great." }] })).includes("reviews"));
assert.ok(!visibleSections(base({ testimonials: [{ quote: "  " }] })).includes("reviews"));
assert.ok(!visibleSections(base({ about: undefined })).includes("about"));
assert.ok(!visibleSections(base({ catering: undefined })).includes("catering"));
assert.ok(!visibleSections(base({ menu: { showPrices: true, categories: [], highlights: [] } })).includes("menu"));
assert.ok(!visibleSections(base({ off: ["gallery", "hero", "footer"] })).includes("gallery"));
assert.ok(visibleSections(base({ off: ["hero", "footer"] })).includes("hero"), "hero cannot be switched off");
assert.ok(visibleSections(base({ off: ["hero", "footer"] })).includes("footer"), "footer cannot be switched off");

// Without permission to use pictures the gallery shows labelled colour tiles, and highlights drop out.
const noPhotos = visibleSections(base({ usePhotos: false }));
assert.ok(noPhotos.includes("gallery") && !noPhotos.includes("highlights"));
assert.ok(!visibleSections(base({ usePhotos: false, gallery: [{ src: "", alt: "" }, { src: "", alt: "" }, { src: "", alt: " " }] })).includes("gallery"), "tiles with no label and no picture are not a gallery");

// Gallery packs into full rows.
const g = (n: number) => galleryTiles(base({ gallery: Array.from({ length: n }, (_, i) => ({ src: `https://x/${i}.jpg`, alt: `p${i}` })) }));
const cells = (t: ReturnType<typeof g>) => t.reduce((a, x) => a + (x.large ? 2 : 1), 0);
for (let n = 0; n <= 12; n++) {
  const t = g(n);
  assert.equal(cells(t) % 3, 0, `${n} pictures leave a gap (${cells(t)} cells)`);
  assert.ok(t.length <= n && t.length <= 10);
}
assert.equal(g(3).length, 3);
assert.ok(g(3).every((x) => !x.large), "three tiles are all the same size");
assert.equal(g(10).length, 10);
assert.equal(g(9).length, 7);
assert.equal(visibleSections(base({ gallery: base().gallery.slice(0, 2) })).includes("gallery"), false);

// Action cards: a card exists only when its link exists, and the section needs at least two.
assert.deepEqual(waysToOrder(base()).map((w) => w.id), ["reserve", "catering", "delivery", "menu"]);
assert.deepEqual(waysToOrder(base({ links: { delivery: [] }, contact: { hours: [] }, catering: undefined })).map((w) => w.id), ["menu"]);
assert.ok(!visibleSections(base({ links: { delivery: [] }, contact: { hours: [] }, catering: undefined })).includes("ways"), "one card is not a section");

// Navigation follows the sections that exist.
assert.deepEqual(navLinks(base()).map((l) => l.label), ["Menu", "About", "Our Food", "Catering", "Contact"]);
assert.deepEqual(navLinks(base({ about: undefined, catering: undefined })).map((l) => l.label), ["Menu", "Our Food", "Contact"]);

// Pages: the menu has its own page, the story has one only when there are real words for it.
assert.equal(hasMenu(base()), true);
assert.equal(hasMenu(base({ menu: { showPrices: true, categories: [{ name: "Empty", items: [] }], highlights: [] } })), false);
assert.equal(menuHref(base()), "/menu");
assert.equal(menuHref(base({ menu: { showPrices: true, categories: [], highlights: [] }, links: { menu: "https://example.com/menu", delivery: [] } })), "https://example.com/menu");
assert.equal(menuHref(base({ menu: { showPrices: true, categories: [], highlights: [] }, links: { menu: "http://example.com/menu", delivery: [] } })), undefined);
assert.equal(waysToOrder(base()).find((w) => w.id === "menu")?.href, "/menu");
assert.equal(hasStory(base()), false);
assert.equal(hasStory(base({ story: { body: "  " } })), false);
assert.equal(hasStory(base({ story: { body: "We started in 2010." } })), true);
assert.deepEqual(navLinks(base({ story: { body: "We started in 2010." } })).map((l) => l.label), ["Menu", "Our story", "Our Food", "Catering", "Contact"]);
assert.deepEqual(navLinks(base({ story: { body: "We started in 2010." } })).map((l) => l.href), ["/menu", "/story", "/#gallery", "/#catering", "/#contact"]);
assert.ok(visibleSections(base({ about: undefined, story: { body: "We started in 2010." } })).includes("about"), "the home page shows the short story even with no separate about text");
assert.deepEqual(navLinks(base({ menu: { showPrices: true, categories: [], highlights: [] } })).map((l) => l.label), ["About", "Our Food", "Catering", "Contact"], "no menu, no menu link");
assert.equal(firstParagraph("One.\n\nTwo."), "One.");
assert.equal(firstParagraph("  \n"), "");

// Stars only for a stated rating.
assert.equal(stars({ quote: "x" }), 0);
assert.equal(stars({ quote: "x", rating: 5 }), 5);
assert.equal(stars({ quote: "x", rating: 7 }), 0);
assert.equal(stars({ quote: "x", rating: 4.5 }), 0);

// Footer: a column with nothing in it is not drawn; links without an address are not links.
assert.deepEqual(footerColumns(base()).map((c) => c.title), ["Contact us", "Hours"]);
assert.deepEqual(footerColumns(base({ contact: { hours: [] }, socials: [{ label: "Instagram", url: "#" }] })).map((c) => c.title), []);
assert.deepEqual(footerColumns(base({ contact: { hours: [] }, socials: [{ label: "Instagram", url: "https://instagram.com/x" }] })).map((c) => c.title), ["Follow us"]);

// A local-business brief is a static site: no database, no owner area.
assert.equal(isStaticBrief({ site: { kind: "local-business" } }), true);
assert.equal(isStaticBrief({ site: { kind: "waitlist" } }), false);

// The pack's example brief must parse and name its kind and design.
const example = JSON.parse(readFileSync(new URL("../vertical-packs/local-business/brief.example.json", import.meta.url), "utf8"));
assert.equal(example.site.kind, "local-business");
assert.equal(example.look.design, "restaurant_001");

// The run folder gets the pack's reference components next to specs/, and a pack without a reference folder gets none.
const tmp = mkdtempSync(path.join(tmpdir(), "lb-"));
const pack = new URL("../vertical-packs/local-business/specs", import.meta.url).pathname;
const ws = await createWorkspace({ prompt: "test", specsDir: pack, brief: example, runsDir: tmp, skipDb: true });
assert.ok(existsSync(path.join(ws.appDir, "reference", "lib", "content.ts")), "reference/lib/content.ts is in the run");
assert.ok(existsSync(path.join(ws.appDir, "reference", "components", "RestaurantPage.tsx")));
assert.ok(existsSync(path.join(ws.appDir, "reference", "styles", "restaurant.css")));
const store = await createWorkspace({ prompt: "test2", specsDir: new URL("../vertical-packs/store/specs", import.meta.url).pathname, brief: {}, runsDir: tmp, skipDb: true });
assert.ok(!existsSync(path.join(store.appDir, "reference")), "a pack without a reference folder gets none");
rmSync(tmp, { recursive: true, force: true });


// Template mode (scaffold): every section is drawn, with labelled placeholders and no invented facts.
{
  const empty = base({ scaffold: true, usePhotos: false, gallery: [], about: undefined, menu: { showPrices: true, categories: [], highlights: [] }, catering: undefined, testimonials: [], contact: { hours: [] }, links: { delivery: [] } });
  const sec = visibleSections(empty);
  for (const id of ["highlights", "menu", "about", "gallery", "reviews", "catering"] as const) assert.ok(sec.includes(id), id + " is drawn in template mode");
  const cards = highlightCards(empty);
  assert.deepEqual(cards.map((x) => x.name), ["Dish 1", "Dish 2", "Dish 3", "Dish 4"]);
  assert.ok(cards.every((x) => x.placeholder && !x.price && !x.description), "placeholder dishes carry no price or text");
  const tiles = galleryTiles(empty);
  assert.deepEqual(tiles.map((t) => t.img.alt), ["Photo 1", "Photo 2", "Photo 3", "Photo 4", "Photo 5"]);
  assert.ok(tiles.every((t) => t.placeholder && !t.img.src));
  assert.deepEqual(footerColumns(empty), [{ title: "Hours", lines: [{ text: "Coming soon" }] }]);
  assert.ok(navLinks(empty).some((l) => l.label === "Menu" && l.href === "/#menu"));
  assert.ok(!navLinks(empty).some((l) => l.href === "/story"), "no story page without story words");
  assert.ok(!visibleSections({ ...empty, off: ["about", "reviews"] }).includes("about"), "a switched off section stays off");
  // Real dishes come first, by name, then placeholders fill up to four.
  const some = highlightCards(base({ scaffold: true, usePhotos: false, menu: { showPrices: true, categories: [{ name: "S", items: [{ name: "Samosa", price: "$5" }, { name: "Soup" }] }], highlights: [] } }));
  assert.deepEqual(some.map((x) => x.name), ["Samosa", "Soup", "Dish 3", "Dish 4"]);
  assert.equal(some[0].price, "$5");
  // Without the flag nothing changes.
  const plain = visibleSections({ ...empty, scaffold: false });
  assert.ok(!plain.includes("reviews") && !plain.includes("gallery") && !plain.includes("menu"));
  assert.deepEqual(footerColumns({ ...empty, scaffold: false }), []);
}

// The look: the menu button names no count, and the heading font cannot be lost to the model's wiring or to a plain h1 rule.
{
  const ref = (f: string) => readFileSync(new URL(`../vertical-packs/local-business/reference/${f}`, import.meta.url), "utf8");
  const spec = (f: string) => readFileSync(new URL(`../vertical-packs/local-business/specs/${f}`, import.meta.url), "utf8");
  assert.ok(/See the full menu</.test(ref("components/MenuTeaser.tsx")) && !/\{dishes\} dishes/.test(ref("components/MenuTeaser.tsx")), "the button has no dish count");
  const fonts = ref("lib/fonts.ts");
  assert.ok(/Vollkorn\(/.test(fonts) && /DM_Sans\(/.test(fonts) && /--font-heading/.test(fonts) && /--font-body/.test(fonts) && /export const fontClasses/.test(fonts), "fonts.ts loads both fonts and exports the classes");
  const css = ref("styles/restaurant.css");
  assert.ok(/^\.rb :is\(h1, h2\) \{ font-family: var\(--font-heading/m.test(css) && !/:where\(\.rb\) :is\(h1, h2\) \{ font-family/.test(css), "the heading rule is not zero-specificity");
  for (const f of ["look.md", "stack.json", "requirements.json"]) assert.ok(/fonts\.ts/.test(spec(f)), `${f} sends the model to src/lib/fonts.ts`);
  assert.ok(/lib\/fonts\.ts/.test(ref("README.md")), "the README copy table has fonts.ts");
}
console.log("local-business tests passed");
