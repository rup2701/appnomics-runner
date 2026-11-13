// Reference logic for the local-business pack (restaurant first). No React in this file, so it can be tested on its own.
// The page reads one typed content object (src/content/site.ts, written from the brief). Every rule about what is shown lives here.

export type Img = { src: string; alt: string };
export type MenuItem = { name: string; description?: string; price?: string };
export type MenuCategory = { name: string; items: MenuItem[] };
export type Card = { title: string; body: string };
export type Testimonial = { quote: string; author?: string; source?: string; rating?: number };
export type Link = { label: string; url: string };

/** The site has three pages: the home page, the full menu at /menu and the owner's story at /story. */
export type PageId = "home" | "menu" | "story";

export type SectionId = "hero" | "highlights" | "menu" | "about" | "gallery" | "reviews" | "catering" | "ways" | "footer";

export type Content = {
  name: string;
  kind?: string;
  tagline?: string;
  contact: { address?: string; phone?: string; email?: string; hours: string[] };
  /** Links the owner's own site already uses. Never a made-up address. */
  links: { reserve?: string; order?: string; menu?: string; catering?: string; delivery: Link[] };
  about?: { heading?: string; body: string };
  /** The owner's own story. It gets its own page at /story only when the owner (or their site) gave real words for it. */
  story?: { heading?: string; body: string; image?: Img };
  menu: { showPrices: boolean; categories: MenuCategory[]; /** Dish names the owner pinned, in order. */ highlights: string[] };
  /** Pictures from the owner's site. Shown only when images.usePhotos is true. */
  gallery: Img[];
  heroImage?: Img;
  aboutImage?: Img;
  usePhotos: boolean;
  catering?: { heading: string; body?: string; features: Card[] };
  testimonials: Testimonial[];
  socials: Link[];
  /** Table requests: the address the booking form posts to. Present only when the builder set it up; without it there is no form. */
  reservations?: { endpoint: string };
  /** Sections the owner switched off. */
  off: SectionId[];
  /**
   * Template mode. Set by the builder (brief page_plan.scaffold). A section with nothing real to show is still drawn, as a labelled
   * placeholder block ("Coming soon", "Dish 1", "Photo 1"), so the owner sees the whole page and can fill it in later. Facts are never invented:
   * prices, hours, address, phone, story words and reviews stay empty, and a placeholder says so.
   */
  scaffold?: boolean;
  accent: string;
};

export const SECTION_ORDER: SectionId[] = ["hero", "highlights", "menu", "about", "gallery", "reviews", "catering", "ways", "footer"];
export const MAX_HIGHLIGHTS = 6;
export const MIN_HIGHLIGHTS = 3;
export const MIN_GALLERY = 3;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const hasMenu = (c: Content) => c.menu.categories.some((k) => k.items.length > 0);
/** The story page exists only when there are real words for it. */
export const hasStory = (c: Content) => !!c.story?.body?.trim();
/** Where "the menu" lives: the menu page when there is a menu, else a menu link the owner's site already has. */
export function menuHref(c: Content): string | undefined {
  return hasMenu(c) ? "/menu" : safeHref(c.links.menu);
}

/** Only https links and tel or mailto links are used. Anything else is treated as no link. */
export function safeHref(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const u = url.trim();
  return /^(https:\/\/|mailto:|tel:)/i.test(u) && u.length < 500 ? u : undefined;
}

export function telHref(phone: string | undefined): string | undefined {
  const digits = (phone ?? "").replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 7 ? `tel:${digits}` : undefined;
}

/** The address the booking form posts to: https only, and only when the builder gave one. Anything else means no form. */
export function requestEndpoint(c: Content): string | undefined {
  const u = c.reservations?.endpoint?.trim();
  return u && /^https:\/\/[^\s]+$/i.test(u) && u.length < 300 ? u : undefined;
}

/**
 * How the Reserve button works. The owner's own booking link comes first; else the request form (when the builder set one up);
 * else a phone call; else it is not drawn. The form is a request, not a booking, so its button says so.
 */
export function reserveMode(c: Content): { mode: "link" | "request" | "phone" | "none"; href?: string; label: string } {
  const link = safeHref(c.links.reserve);
  if (link) return { mode: "link", href: link, label: "Reserve a table" };
  if (requestEndpoint(c)) return { mode: "request", href: "/#reserve", label: "Request a table" };
  const tel = telHref(c.contact.phone);
  if (tel) return { mode: "phone", href: tel, label: "Call to reserve" };
  return { mode: "none", label: "" };
}

/** A price is shown only when the owner allows prices and the site stated one. A missing price is never filled in. */
export function priceText(item: MenuItem, showPrices: boolean): string | undefined {
  if (!showPrices) return undefined;
  const p = item.price?.trim();
  return p ? p : undefined;
}

export type Highlight = MenuItem & { image?: Img; placeholder?: boolean };

export const SCAFFOLD_DISHES = 4;
export const SCAFFOLD_TILES = 5;
export const isScaffold = (c: Content) => c.scaffold === true;

/**
 * Dish cards for the top of the page. Pinned names come first; when none are pinned, dishes that have a real picture are used.
 * A picture belongs to a dish only when its alt text is exactly the dish name, and only when pictures are allowed.
 */
export function pickHighlights(c: Content): Highlight[] {
  const all = c.menu.categories.flatMap((cat) => cat.items);
  const byName = new Map(all.map((i) => [norm(i.name), i]));
  const pic = (name: string) => (c.usePhotos ? c.gallery.find((g) => norm(g.alt) === norm(name)) : undefined);
  const pinned = c.menu.highlights.map((n) => byName.get(norm(n))).filter((i): i is MenuItem => !!i);
  const chosen = pinned.length ? pinned : c.usePhotos ? all.filter((i) => pic(i.name)) : [];
  return chosen.slice(0, MAX_HIGHLIGHTS).map((i) => ({ ...i, image: pic(i.name) }));
}

/**
 * The dish cards actually drawn. Normally the same as pickHighlights. In template mode, when there are not enough dishes with pictures, the cards are
 * the first real dishes by name (no picture, a colour block) padded with "Dish 1", "Dish 2" placeholders up to four. A placeholder has no price or text.
 */
export function highlightCards(c: Content): Highlight[] {
  const real = pickHighlights(c);
  if (real.length >= MIN_HIGHLIGHTS || !isScaffold(c)) return real;
  const dishes: Highlight[] = c.menu.categories.flatMap((cat) => cat.items).slice(0, SCAFFOLD_DISHES);
  for (let n = dishes.length + 1; dishes.length < SCAFFOLD_DISHES; n++) dishes.push({ name: `Dish ${n}`, placeholder: true });
  return dishes;
}

/**
 * Gallery tiles in a 3 column grid. From five tiles up, every fifth tile is double wide, and the count is trimmed so the last row is full
 * (5, 7, 10, 12 tiles fit). Under five tiles all are the same size and the count is a multiple of three.
 */
export function galleryTiles(c: Content): { img: Img; large: boolean; placeholder?: boolean }[] {
  const all = c.gallery.filter((g) => (c.usePhotos ? g.src : g.alt.trim())).slice(0, 10);
  let n = all.length;
  if (n < 5) n -= n % 3;
  else {
    const m = n % 5;
    if (m === 1 || m === 3) n -= 1;
    else if (m === 4) n -= 2;
  }
  if (n < MIN_GALLERY && isScaffold(c)) {
    return Array.from({ length: SCAFFOLD_TILES }, (_, i) => ({ img: { src: "", alt: `Photo ${i + 1}` }, large: i % 5 === 0, placeholder: true }));
  }
  return all.slice(0, n).map((img, i) => ({ img, large: n >= 5 && i % 5 === 0 }));
}

export type Way = { id: "reserve" | "catering" | "delivery" | "menu"; title: string; text: string; href: string; cta: string };

/** Action cards. A card exists only when its link or phone exists. */
export function waysToOrder(c: Content): Way[] {
  const out: Way[] = [];
  const r = reserveMode(c);
  if (r.href) out.push({ id: "reserve", title: "Book a table", text: "Reserve your spot for a meal with us.", href: r.href, cta: r.label });
  const cat = safeHref(c.links.catering) ?? (c.catering ? telHref(c.contact.phone) : undefined);
  if (cat && c.catering) out.push({ id: "catering", title: "Catering", text: "Let us cater your next event.", href: cat, cta: "Ask about catering" });
  const order = safeHref(c.links.order) ?? safeHref(c.links.delivery[0]?.url);
  if (order) out.push({ id: "delivery", title: "Order online", text: "Takeout and delivery, straight from the restaurant.", href: order, cta: "Order now" });
  const menu = menuHref(c);
  if (menu) out.push({ id: "menu", title: "See the menu", text: "Everything we cook, with prices.", href: menu, cta: "View menu" });
  return out;
}

/** Which sections are drawn, in order. A section with nothing real to show is left out. */
export function visibleSections(c: Content): SectionId[] {
  const has: Record<SectionId, boolean> = {
    hero: true,
    highlights: highlightCards(c).length >= MIN_HIGHLIGHTS,
    menu: hasMenu(c) || isScaffold(c),
    about: !!c.about?.body?.trim() || hasStory(c) || isScaffold(c),
    // Without permission to use the owner's pictures the gallery shows labelled colour tiles, so it needs labels instead of pictures.
    gallery: galleryTiles(c).length >= MIN_GALLERY,
    reviews: c.testimonials.some((t) => t.quote.trim().length > 0) || isScaffold(c),
    catering: (!!c.catering && (!!c.catering.body || c.catering.features.length > 0)) || isScaffold(c),
    ways: waysToOrder(c).length >= 2,
    footer: true,
  };
  // The hero and the footer cannot be switched off.
  return SECTION_ORDER.filter((id) => has[id] && (id === "hero" || id === "footer" || !(c.off ?? []).includes(id)));
}

/** Links for the top bar. Pages that exist get a link to the page, sections on the home page get a link to their place on it, and Contact goes to the footer. */
export function navLinks(c: Content): { label: string; href: string }[] {
  const shown = visibleSections(c);
  const links: { label: string; href: string }[] = [];
  if (hasMenu(c)) links.push({ label: "Menu", href: "/menu" });
  else if (shown.includes("menu")) links.push({ label: "Menu", href: "/#menu" });
  if (hasStory(c)) links.push({ label: "Our story", href: "/story" });
  else if (shown.includes("about")) links.push({ label: "About", href: "/#about" });
  if (shown.includes("gallery")) links.push({ label: "Our Food", href: "/#gallery" });
  if (shown.includes("reviews")) links.push({ label: "Reviews", href: "/#reviews" });
  if (shown.includes("catering")) links.push({ label: "Catering", href: "/#catering" });
  links.push({ label: "Contact", href: "/#contact" });
  return links;
}

/** The first paragraph of a text, as the owner wrote it. Used for the short version on the home page. */
export function firstParagraph(text: string): string {
  return text.split(/\n+/).map((p) => p.trim()).find(Boolean) ?? "";
}

/** Stars are drawn only for a rating the page itself showed. */
export function stars(t: Testimonial): number {
  return Number.isInteger(t.rating) && (t.rating as number) >= 1 && (t.rating as number) <= 5 ? (t.rating as number) : 0;
}

export function footerColumns(c: Content): { title: string; lines: { text: string; href?: string }[] }[] {
  const contact: { text: string; href?: string }[] = [];
  if (c.contact.address) contact.push({ text: c.contact.address });
  if (c.contact.phone) contact.push({ text: c.contact.phone, href: telHref(c.contact.phone) });
  if (c.contact.email) contact.push({ text: c.contact.email, href: `mailto:${c.contact.email}` });
  const cols = [] as { title: string; lines: { text: string; href?: string }[] }[];
  if (contact.length) cols.push({ title: "Contact us", lines: contact });
  if (c.contact.hours.length) cols.push({ title: "Hours", lines: c.contact.hours.map((h) => ({ text: h })) });
  else if (isScaffold(c)) cols.push({ title: "Hours", lines: [{ text: "Coming soon" }] });
  const soc = c.socials.map((s) => ({ text: s.label, href: safeHref(s.url) })).filter((s) => s.href);
  if (soc.length) cols.push({ title: "Follow us", lines: soc });
  return cols;
}
