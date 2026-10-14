import { parseIdealoUrl } from "@idealo-hw/idealo-query";
import { z } from "zod";
import type { ListingItem, PageAdapter, PageKind, ProductInfo } from "./adapter";
import { parseGermanPrice } from "./german-price";

const ID = "heuristic_idealo";
const OFFERS_LINK = 'a[href*="/OffersOfProduct/"]';
const HEART = "[data-wishlist-heart]";
const PRICE = ".sr-detailedPriceInfo__price";
const PRODUCT_ID_IN_HREF = /\/OffersOfProduct\/(\d+)/;
const ID_KEYS = ["productId", "product_id", "id", "itemId"] as const;
/** Climbing from a product link/heart stops below these. */
const CONTAINER_TAGS = new Set(["BODY", "MAIN", "UL", "OL", "HTML", "SECTION"]);
const ITEM_TAGS = new Set(["LI", "ARTICLE"]);
const MAX_SPEC_CHARS = 20_000;

const collapse = (text: string | null | undefined): string =>
  (text ?? "").replace(/\s+/g, " ").trim();

const idString = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(z.string().regex(/^\d+$/));

function idFromHeart(raw: string | null): string | undefined {
  if (raw === null) return undefined;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const record = z.record(z.string(), z.unknown()).safeParse(json);
  if (!record.success) return undefined;
  for (const key of ID_KEYS) {
    const id = idString.safeParse(record.data[key]);
    if (id.success) return id.data;
  }
  return undefined;
}

const idFromHref = (href: string | null): string | undefined =>
  PRODUCT_ID_IN_HREF.exec(href ?? "")?.[1];

interface Seed {
  element: Element;
  id: string;
}

function findSeeds(root: ParentNode): Seed[] {
  const seeds: Seed[] = [];
  for (const element of root.querySelectorAll(`${HEART}, ${OFFERS_LINK}`)) {
    const id = element.matches(HEART)
      ? (idFromHeart(element.getAttribute("data-wishlist-heart")) ??
        idFromHref(element.getAttribute("href")))
      : idFromHref(element.getAttribute("href"));
    if (id !== undefined) seeds.push({ element, id });
  }
  return seeds;
}

/**
 * Grows from a seed to the largest ancestor that still holds a single product id, stopping at the
 * first li/article or at a list-like container. No class names needed.
 */
function itemRootOf(seed: Seed, seeds: readonly Seed[]): Element {
  let current = seed.element;
  for (;;) {
    const parent = current.parentElement;
    if (parent === null || CONTAINER_TAGS.has(parent.tagName)) return current;
    if (seeds.some((other) => other.id !== seed.id && parent.contains(other.element)))
      return current;
    current = parent;
    if (ITEM_TAGS.has(current.tagName)) return current;
  }
}

function titleOf(item: Element, text: string): string {
  const links = [...item.querySelectorAll(OFFERS_LINK)]
    .map((a) => collapse(a.getAttribute("title") ?? a.getAttribute("aria-label") ?? a.textContent))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  return (
    links[0] || collapse(item.querySelector("h1, h2, h3, h4")?.textContent) || text.slice(0, 160)
  );
}

function priceOf(item: Element, text: string): number | undefined {
  const node = item.querySelector(PRICE);
  return (
    (node ? parseGermanPrice(collapse(node.textContent)) : undefined) ??
    parseGermanPrice(text, true)
  );
}

const ProductJsonSchema = z.object({
  name: z.string().optional(),
  offers: z
    .union([z.array(z.record(z.string(), z.unknown())), z.record(z.string(), z.unknown())])
    .optional(),
});

const priceNumber = z.coerce.number().positive();

function readProductJson(root: ParentNode): { title?: string; priceEur?: number } {
  const script = root.querySelector('script[data-testid="Product"]');
  if (!script?.textContent) return {};
  let json: unknown;
  try {
    json = JSON.parse(script.textContent);
  } catch {
    return {};
  }
  const product = ProductJsonSchema.safeParse(json);
  if (!product.success) return {};
  const offer = Array.isArray(product.data.offers) ? product.data.offers[0] : product.data.offers;
  const price = priceNumber.safeParse(offer?.lowPrice ?? offer?.price);
  return {
    ...(product.data.name ? { title: product.data.name } : {}),
    ...(price.success ? { priceEur: price.data } : {}),
  };
}

const SPEC_SELECTORS =
  'table, dl, [class*="datasheet" i], [class*="spec" i], [data-testid*="spec" i]';

function specTextOf(root: ParentNode): string {
  const specs = [...root.querySelectorAll(SPEC_SELECTORS)].map((n) => collapse(n.textContent));
  const text =
    specs.length > 0
      ? specs.join(" ")
      : collapse((root.querySelector("main") ?? root.querySelector("body"))?.textContent);
  return text.slice(0, MAX_SPEC_CHARS);
}

/** Low price from the product script, else the page's price node. */
export const productPriceOf = (root: ParentNode): number | undefined =>
  readProductJson(root).priceEur ??
  parseGermanPrice(collapse(root.querySelector(PRICE)?.textContent), true);

export const heuristicIdealoAdapter: PageAdapter = {
  id: ID,

  detect(url): PageKind {
    const { kind } = parseIdealoUrl(url);
    if (kind === "category" || kind === "search") return "listing";
    return kind === "product" ? "product" : "other";
  },

  listingItems(root): ListingItem[] {
    const seeds = findSeeds(root);
    const items = new Map<Element, string>();
    for (const seed of seeds) {
      const element = itemRootOf(seed, seeds);
      if (!items.has(element)) items.set(element, seed.id);
    }
    return [...items].map(([element, productId]) => {
      const text = collapse(element.textContent);
      const priceEur = priceOf(element, text);
      return {
        element,
        productId,
        title: titleOf(element, text),
        text,
        textSource: "dom" as const,
        adapterId: ID,
        ...(priceEur === undefined ? {} : { priceEur }),
      };
    });
  },

  productInfo(root): ProductInfo | null {
    const json = readProductJson(root);
    const heading = root.querySelector("h1");
    const title = json.title ?? collapse(heading?.textContent);
    if (title === "") return null;
    const priceEur = productPriceOf(root);
    return {
      element: heading,
      title,
      specText: specTextOf(root),
      adapterId: ID,
      ...(priceEur === undefined ? {} : { priceEur }),
    };
  },
};
