import { parseGermanPrice } from "../../german-price";
import type { ListingItem } from "../../port";
import { collapse } from "../../text";
import { findSeeds, type Seed } from "./ids";
import { ADAPTER_ID, CONTAINER_TAGS, ITEM_TAGS, OFFERS_LINK, PRICE } from "./selectors";

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

export function heuristicListingItems(root: ParentNode): ListingItem[] {
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
      adapterId: ADAPTER_ID,
      ...(priceEur === undefined ? {} : { priceEur }),
    };
  });
}
