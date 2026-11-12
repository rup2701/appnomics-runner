// The interview: code picks the next question and checks every answer before it reaches the brief.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyAnswer, nextQuestions, QUESTIONS, renderAsk } from "../vertical-packs/local-business/interview/interview.js";

// A Bayleaf-shaped brief from a private test: no story, no reviews, no email, no socials, the site's own contact page as the Reserve link.
const brief = (): Record<string, any> => ({
  site: { name: "Test Kitchen" },
  private_test: true,
  contact: { address: "1 Test St", phone: "510-555-0100", email: null, hours: ["Open daily 10 to 10"] },
  links: { reserve: "https://example.com/contact", order: null },
  menu: { show_prices: true, highlights: [], categories: [{ name: "Starters", items: [{ name: "Kale Chat", price: "$13" }, { name: "Samosa" }, { name: "Papadam" }, { name: "Lentil Soup" }] }] },
  images: { use_photos: true, owner_confirmed: false },
  story: null, testimonials: [], socials: [],
  not_found: ["email", "customer reviews", "social links", "story page"],
});
const ids = (b: object, s = { asked: [] as string[], skipped: [] as string[] }, n = 3) => nextQuestions(b, s, n).map((q) => q.id);

// Every question has a handler, a unique id, and the file says what it is for.
assert.equal(new Set(QUESTIONS.map((q) => q.id)).size, QUESTIONS.length);
for (const q of QUESTIONS) assert.ok(q.ask && q.why && q.options.length >= 2 && q.when.length >= 1, q.id);
assert.equal(JSON.parse(readFileSync(new URL("../vertical-packs/local-business/interview/questions.json", import.meta.url), "utf8")).kind, "restaurant");

// Order: story first for a private test (no owner confirmation is asked), then reviews, then the rest.
assert.deepEqual(ids(brief(), undefined, 4), ["story", "reviews", "highlights", "email"]);
assert.equal(nextQuestions(brief()).length, 1, "one question at a time by default");
// For a real owner the first question is the confirmation.
assert.equal(ids({ ...brief(), private_test: undefined })[0], "confirm-owner");
// Asked or skipped questions never come back.
assert.deepEqual(ids(brief(), { asked: ["story"], skipped: ["reviews"] }, 2), ["highlights", "email"]);
// A filled field removes its question.
assert.ok(!ids({ ...brief(), story: { heading: "Our story", body: "x".repeat(50) } }, undefined, 10).includes("story"));
// The ask uses the restaurant's own name and dishes.
assert.match(renderAsk(QUESTIONS.find((q) => q.id === "highlights")!, brief()), /Kale Chat, Samosa, Papadam/);
assert.match(renderAsk(QUESTIONS.find((q) => q.id === "story")!, brief()), /Test Kitchen/);

const ok = (id: string, a: unknown, b = brief()) => { const r = applyAnswer(b, id, a); assert.ok(r.ok, `${id}: ${r.ok ? "" : r.error}`); return (r as { brief: any }).brief; };
const bad = (id: string, a: unknown, b = brief()) => { const r = applyAnswer(b, id, a); assert.equal(r.ok, false, `${id} should refuse`); };

// Story: needs real words; writes the story and clears the gap.
bad("story", { text: "short" });
let b = ok("story", { text: "We opened in 2010 and cook what our families cook at home, slowly and with care." });
assert.equal(b.story.heading, "Our story");
assert.ok(!b.not_found.includes("story page"));
// The original is never changed by a refused or an accepted answer.
const orig = brief(); applyAnswer(orig, "story", { text: "We opened in 2010 and cook what our families cook at home." });
assert.equal(orig.story, null);

// Reviews: only the owner's pasted words, deduped, ratings only 1 to 5 whole numbers.
bad("reviews", { reviews: [] });
b = ok("reviews", { reviews: [{ quote: "Best momo in town.", author: "Sam", rating: 5 }, { quote: "best  momo in town." }, { quote: "Lovely staff.", rating: 9 }] });
assert.deepEqual(b.testimonials, [{ quote: "Best momo in town.", author: "Sam", rating: 5 }, { quote: "Lovely staff." }]);

// Highlights: dish names must be on the menu, three to six.
bad("highlights", { dishes: ["Kale Chat", "Samosa", "Pizza"] });
bad("highlights", { dishes: ["Kale Chat", "Samosa"] });
b = ok("highlights", { dishes: ["kale chat", "Samosa", "Papadam"] });
assert.deepEqual(b.menu.highlights, ["Kale Chat", "Samosa", "Papadam"], "the menu's own spelling is stored");

// Links and contact details are checked.
bad("booking", { url: "http://example.com/book" });
bad("booking", { url: "javascript:alert(1)" });
assert.equal(ok("booking", { url: "https://resy.com/cities/x/test" }).links.reserve, "https://resy.com/cities/x/test");
bad("email", { email: "not an email" });
b = ok("email", { email: "hello@example.com" });
assert.equal(b.contact.email, "hello@example.com");
assert.ok(!b.not_found.includes("email"));
bad("socials", { links: [{ label: "Instagram", url: "http://x" }] });
assert.equal(ok("socials", { links: [{ label: "Instagram", url: "https://instagram.com/x" }] }).socials.length, 1);
bad("hours", { lines: [" "] });
assert.deepEqual(ok("hours", { lines: ["Mon to Fri 11 to 9"] }).contact.hours, ["Mon to Fri 11 to 9"]);
assert.equal(ok("prices", { show: false }).menu.show_prices, false);
bad("prices", { show: "no" });
bad("nope", {});

// Owner confirmation: needs a name; never clears a private test.
const real = { ...brief(), private_test: undefined };
bad("confirm-owner", { owner: true }, real);
b = ok("confirm-owner", { owner: true, confirmedBy: "owner@example.com" }, real);
assert.equal(b.images.owner_confirmed, true);
assert.deepEqual(b.consent, { owner_confirmed: true, by: "owner@example.com" });
bad("confirm-owner", { owner: true, confirmedBy: "owner@example.com" }, brief());
assert.equal(brief().private_test, true);

console.log("interview tests passed");
