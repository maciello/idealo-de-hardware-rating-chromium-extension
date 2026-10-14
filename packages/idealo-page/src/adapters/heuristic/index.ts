import { parseIdealoUrl } from "@idealo-hw/idealo-query";
import type { PageAdapter, PageKind } from "../../port";
import { heuristicListingItems } from "./listing";
import { heuristicProductInfo, productPriceOf } from "./product";
import { ADAPTER_ID } from "./selectors";

export { productPriceOf };

export const heuristicIdealoAdapter: PageAdapter = {
  id: ADAPTER_ID,

  detect(url): PageKind {
    const { kind } = parseIdealoUrl(url);
    if (kind === "category" || kind === "search") return "listing";
    return kind === "product" ? "product" : "other";
  },

  listingItems: heuristicListingItems,
  productInfo: heuristicProductInfo,
};
