import type { ListingItem, PageAdapter, PageKind, ProductInfo } from "./adapter";
import { heuristicIdealoAdapter } from "./heuristic-idealo-adapter";
import { ssrTileItems } from "./ssr-tiles";

/**
 * idealo's real listing markup is primary. The heuristic adapter (written while the markup was
 * unknown) only answers when no real tile is found, e.g. after a redesign renames the tile classes,
 * and also serves product pages and URL classification.
 */
export const idealoAdapter: PageAdapter = {
  id: "idealo",

  detect: (url): PageKind => heuristicIdealoAdapter.detect(url),

  listingItems(root): ListingItem[] {
    const tiles = ssrTileItems(root);
    return tiles.length > 0 ? tiles : heuristicIdealoAdapter.listingItems(root);
  },

  productInfo: (root): ProductInfo | null => heuristicIdealoAdapter.productInfo(root),
};
