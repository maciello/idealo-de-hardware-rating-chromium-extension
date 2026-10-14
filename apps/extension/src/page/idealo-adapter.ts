import type { ListingItem, PageAdapter, PageKind, ProductInfo } from "./adapter";
import { heuristicIdealoAdapter, productPriceOf } from "./heuristic-idealo-adapter";
import { ssrProductInfo } from "./ssr-product";
import { ssrTileItems } from "./ssr-tiles";

/**
 * idealo's real listing markup is primary. The heuristic adapter (written while the markup was
 * unknown) only answers when no real tile or product datasheet is found, e.g. after a redesign
 * renames the markup, and also classifies URLs.
 */
export const idealoAdapter: PageAdapter = {
  id: "idealo",

  detect: (url): PageKind => heuristicIdealoAdapter.detect(url),

  listingItems(root): ListingItem[] {
    const tiles = ssrTileItems(root);
    return tiles.length > 0 ? tiles : heuristicIdealoAdapter.listingItems(root);
  },

  productInfo(root): ProductInfo | null {
    const real = ssrProductInfo(root);
    if (real === null) return heuristicIdealoAdapter.productInfo(root);
    const priceEur = productPriceOf(root);
    return { ...real, ...(priceEur === undefined ? {} : { priceEur }) };
  },
};
