import type { FilterCatalogSource } from "./port";

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
