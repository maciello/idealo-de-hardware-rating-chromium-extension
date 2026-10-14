import { groupKey } from "./group-key";
import type { FilterCatalog, FilterGroup } from "./model";

const onlyOne = <T>(items: readonly T[]): T | undefined =>
  items.length === 1 ? items[0] : undefined;

/**
 * idealo lists at most 100 options per group, chosen per filter state (ADR 0008,
 * live-2026-10-14-option-cap), yet applies every F-id in the url. An F-id outside the listed
 * options is of unknown group, so a plan cannot replace it. A vocabulary is the union of the
 * catalogs seen for one category; merged under the current catalog it restores the group of
 * every option that was ever listed.
 */

/**
 * `current` with each option of `remembered` it does not list appended to the group of the same
 * name (a new group when it has none). Where the catalog lists several groups under one name
 * (Grafikspeicher twice), the one with the same attribute id takes the option; without a match
 * the option keeps its own group. Appended options carry no count: hit counts belong to the
 * filter state they were served for. Catalogs of different categories are not merged.
 */
export function mergeCatalogs(current: FilterCatalog, remembered: FilterCatalog): FilterCatalog {
  if (current.categoryId !== remembered.categoryId) return current;
  const listed = new Set(current.groups.flatMap((g) => g.filters.map((f) => f.filterId)));
  const groups: FilterGroup[] = current.groups.map((g) => ({ ...g, filters: [...g.filters] }));
  const targetOf = (group: FilterGroup): FilterGroup | undefined => {
    const named = groups.filter((g) => groupKey(g.name) === groupKey(group.name));
    return named.find((g) => g.attributeId === group.attributeId) ?? onlyOne(named);
  };
  for (const group of remembered.groups) {
    const extra = group.filters
      .filter((f) => !listed.has(f.filterId))
      .map(({ filterId, label }) => ({ filterId, label }));
    if (extra.length === 0) continue;
    for (const f of extra) listed.add(f.filterId);
    const target = targetOf(group);
    if (target === undefined) groups.push({ ...group, filters: extra });
    else target.filters.push(...extra);
  }
  return { ...current, groups };
}

/** `catalog` without hit counts, the form a vocabulary keeps. */
export const vocabularyOf = (catalog: FilterCatalog): FilterCatalog => ({
  categoryId: catalog.categoryId,
  groups: catalog.groups.map((g) => ({
    ...g,
    filters: g.filters.map(({ filterId, label }) => ({ filterId, label })),
  })),
  manufacturers: [],
});
