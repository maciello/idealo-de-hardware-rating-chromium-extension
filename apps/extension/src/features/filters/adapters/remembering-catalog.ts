import type { FilterCatalogSource } from "@idealo-hw/idealo-page";
import { type FilterCatalog, mergeCatalogs, vocabularyOf } from "@idealo-hw/idealo-query";

/** Port: the filter options seen so far per category, without hit counts. */
export interface VocabularyStore {
  load(categoryId: string): Promise<FilterCatalog | null>;
  save(vocabulary: FilterCatalog): Promise<void>;
}

/**
 * Decorates a catalog source with every option an earlier page of the category listed. idealo lists
 * at most 100 options per group, chosen per filter state, so a CPU an earlier plan selected can be
 * missing from the current listing while its F-id stays in the url; only a catalog that still knows
 * the option lets the next plan replace it. A store failure degrades to the plain catalog.
 */
export const rememberingCatalog = (
  source: FilterCatalogSource,
  store: VocabularyStore,
): FilterCatalogSource => ({
  id: `remembering(${source.id})`,
  async load(context) {
    const current = await source.load(context);
    if (current === null) return null;
    const remembered = await store.load(current.categoryId).catch(() => null);
    const merged = remembered === null ? current : mergeCatalogs(current, remembered);
    await store.save(vocabularyOf(merged)).catch(() => undefined);
    return merged;
  },
});
