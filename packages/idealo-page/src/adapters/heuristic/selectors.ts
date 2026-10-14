export const ADAPTER_ID = "heuristic_idealo";
export const OFFERS_LINK = 'a[href*="/OffersOfProduct/"]';
export const HEART = "[data-wishlist-heart]";
export const PRICE = ".sr-detailedPriceInfo__price";
export const PRODUCT_ID_IN_HREF = /\/OffersOfProduct\/(\d+)/;
export const ID_KEYS = ["productId", "product_id", "id", "itemId"] as const;
/** Climbing from a product link/heart stops below these. */
export const CONTAINER_TAGS = new Set(["BODY", "MAIN", "UL", "OL", "HTML", "SECTION"]);
export const ITEM_TAGS = new Set(["LI", "ARTICLE"]);
export const MAX_SPEC_CHARS = 20_000;
export const SPEC_SELECTORS =
  'table, dl, [class*="datasheet" i], [class*="spec" i], [data-testid*="spec" i]';
