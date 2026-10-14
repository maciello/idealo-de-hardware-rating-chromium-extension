import type { FilterCatalog, FilterId } from "@idealo-hw/idealo-query";

export interface FilterQuestion {
  readonly filterId: FilterId;
  readonly text: string;
}

/** Every distinct catalog filter value (and manufacturer search filter) as one yes/no question text. */
export function filterQuestions(catalog: FilterCatalog): FilterQuestion[] {
  const seen = new Set<FilterId>();
  const questions: FilterQuestion[] = [];
  const add = (filterId: FilterId, group: string, label: string): void => {
    if (seen.has(filterId) || label.trim() === "") return;
    seen.add(filterId);
    questions.push({
      filterId,
      text: `Does the shopping request in \`request\` ask for the product filter "${group}: ${label.trim()}"?`,
    });
  };
  for (const group of catalog.groups) {
    for (const filter of group.filters) add(filter.filterId, group.name, filter.label);
  }
  for (const manufacturer of catalog.manufacturers) {
    if (manufacturer.searchFilterId !== undefined) {
      add(manufacturer.searchFilterId, "Manufacturer", manufacturer.name);
    }
  }
  return questions;
}
