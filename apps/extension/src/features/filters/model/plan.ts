import {
  type FilterCatalog,
  type IdealoQuery,
  isEmpty,
  type ModelScorer,
  planRequirements,
  type Requirements,
  type RequirementsPlan,
} from "@idealo-hw/idealo-query";

/** Url that applies a query on this page type; "" when it cannot be expressed. */
export const safeUrl = (toUrl: (query: IdealoQuery) => string, query: IdealoQuery): string => {
  try {
    return toUrl(query);
  } catch {
    return "";
  }
};

/**
 * The query the requirements stand for, with its hit estimate. Null while there is nothing to plan:
 * no catalog of this category yet, no requirements, or a plan that cannot be made.
 */
export function planOf(
  catalog: FilterCatalog | null,
  query: IdealoQuery,
  requirements: Requirements,
  scorer: ModelScorer,
): RequirementsPlan | null {
  if (catalog === null || catalog.categoryId !== query.categoryId || isEmpty(requirements)) {
    return null;
  }
  try {
    return planRequirements(requirements, catalog, query, scorer);
  } catch {
    return null;
  }
}
