import { embeddedListing } from "../page/embedded-listing";
import type { FilterCatalogSource } from "./catalog-source";

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
