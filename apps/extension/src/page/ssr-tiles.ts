import { z } from "zod";
import type { ListingItem } from "./adapter";
import { embeddedListing } from "./embedded-listing";
import { parseGermanPrice } from "./german-price";

export const SSR_ADAPTER_ID = "idealo_ssr";

/**
 * Class names are CSS-module hashed (`sr-resultItemTile_B0odU`), so elements are matched by prefix.
 * Descendants share the prefix (`sr-resultItemTile__buttons_kvQyr`); the tile container is the one
 * whose name ends right after a five-character hash.
 */
const TILE = '[class*="sr-resultItemTile_"]';
const TILE_CLASS = /^sr-resultItemTile_[\w-]{5}$/;
const HEART = "[data-wishlist-heart]";
const TITLE = '[class*="sr-productSummary__title_"]';
const DETAILS = '[class*="sr-productSummary__mainDetails_"]';
const PRICE = '[class*="sr-detailedPriceInfo__price_"]';

const collapse = (text: string | null | undefined): string =>
  (text ?? "").replace(/\s+/g, " ").trim();

const HeartSchema = z.object({ id: z.string().min(1), type: z.string() });

function heartOf(tile: Element): z.infer<typeof HeartSchema> | null {
  const raw = tile.querySelector(HEART)?.getAttribute("data-wishlist-heart");
  if (raw == null) return null;
  try {
    const parsed = HeartSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const documentOf = (root: ParentNode): Document | null =>
  root.nodeType === 9 ? (root as Document) : (root as Node).ownerDocument;

/**
 * Listing tiles from idealo's server-rendered markup. Offer tiles (single shop offers) carry an
 * opaque hash instead of a product id: they become items without `productId`, rated from their
 * title alone, because the payload lists no specs for them.
 */
export function ssrTileItems(root: ParentNode): ListingItem[] {
  const doc = documentOf(root);
  const embedded = doc === null ? null : embeddedListing(doc);
  const payloadProducts = new Map(
    (embedded?.page.items ?? []).filter((item) => item.kind === "product").map((i) => [i.id, i]),
  );

  const items: ListingItem[] = [];
  for (const tile of root.querySelectorAll(TILE)) {
    if (![...tile.classList].some((name) => TILE_CLASS.test(name))) continue;
    const heart = heartOf(tile);
    const productId = heart?.type === "PRODUCT" ? heart.id : undefined;
    const known = productId === undefined ? undefined : payloadProducts.get(productId);
    const specs = known?.characteristics ?? [];
    const priceEur =
      parseGermanPrice(collapse(tile.querySelector(PRICE)?.textContent), true) ?? known?.priceEur;
    items.push({
      element: tile,
      ...(productId === undefined ? {} : { productId }),
      title: collapse(tile.querySelector(TITLE)?.textContent) || (known?.title ?? ""),
      text:
        specs.length > 0 ? specs.join(", ") : collapse(tile.querySelector(DETAILS)?.textContent),
      textSource: specs.length > 0 ? "embedded" : "dom",
      ...(priceEur == null ? {} : { priceEur }),
      adapterId: SSR_ADAPTER_ID,
    });
  }
  return items;
}
