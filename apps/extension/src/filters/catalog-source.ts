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

/** First non-null catalog wins, so richer sources can be listed before the DOM heuristic. */
export const firstCatalog = (sources: readonly FilterCatalogSource[]): FilterCatalogSource => ({
  id: `first_of(${sources.map((s) => s.id).join(",")})`,
  async load(context) {
    for (const source of sources) {
      const catalog = await source.load(context);
      if (catalog !== null) return catalog;
    }
    return null;
  },
});
