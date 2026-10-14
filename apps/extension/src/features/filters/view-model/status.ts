import type { FilterCatalog } from "@idealo-hw/idealo-query";
import { FILTERS_COPY } from "../copy";

export interface PanelNote {
  testId: string;
  text: string;
}

/**
 * The note above the controls when the panel can offer less than usual: a search page with no
 * category, or a category page whose filters could not be read.
 */
export function panelNote(
  canFilter: boolean,
  loaded: boolean,
  catalog: FilterCatalog | null,
): PanelNote | null {
  if (!canFilter) return { testId: "no-category-note", text: FILTERS_COPY.noCategoryNote };
  if (loaded && catalog === null) {
    return { testId: "no-catalog-note", text: FILTERS_COPY.noCatalogNote };
  }
  return null;
}
