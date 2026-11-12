// The display rules of the local-business reference: what is drawn, and what is never invented.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { galleryTiles, navLinks, pickHighlights, priceText, reserveMode, safeHref, stars, visibleSections, waysToOrder, footerColumns, type Content } from "../vertical-packs/local-business/reference/lib/content.js";
import { isStaticBrief } from "../src/kind.js";

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
assert.deepEqual(navLinks(base()).map((l) => l.label), ["Menu", "About", "Gallery", "Catering", "Contact"]);
assert.deepEqual(navLinks(base({ about: undefined, catering: undefined })).map((l) => l.label), ["Menu", "Gallery", "Contact"]);

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

console.log("local-business tests passed");
