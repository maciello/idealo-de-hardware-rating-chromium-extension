import { embeddedListing } from "../listing";
import type { FilterCatalogSource } from "./port";

/**
 * The filter catalog idealo inlines into every server-rendered listing. After client-side filter
 * changes it is stale, but its filter ids stay valid; a different category (client-side navigation
 * elsewhere) is not this page's catalog.
 */
export const embeddedCatalog: FilterCatalogSource = {
  id: "embedded_payload",
  async load({ document, query }) {
    const embedded = embeddedListing(document);
    if (embedded?.categoryId !== query.categoryId) return null;
    return embedded.page.catalog.groups.length > 0 ? embedded.page.catalog : null;
  },
};

/** Cheapest and dearest price of the served result set, for the price slider; null without a matching payload. */
export function embeddedPriceBounds(
  document: Document,
  categoryId: string,
): { min: number; max: number } | null {
  const embedded = embeddedListing(document);
  return embedded?.categoryId === categoryId ? embedded.page.priceBounds : null;
}
