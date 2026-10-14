import type { FilterCatalog, IdealoQuery } from "@idealo-hw/idealo-query";

export interface CatalogContext {
  document: Document;
  url: string;
  query: IdealoQuery;
}

/**
 * Port: where the filter options of the current category come from. `null` means "this source
 * cannot tell"; the panel then falls back to raw filter-id entry.
 */
export interface FilterCatalogSource {
  readonly id: string;
  load(context: CatalogContext): Promise<FilterCatalog | null>;
}
