import { groupKey } from "./group-key";
import type { FilterCatalog, FilterGroup } from "./model";

/**
 * idealo lists at most 100 options per group, chosen per filter state (ADR 0008,
 * live-2026-10-14-option-cap), yet applies every F-id in the url. An F-id outside the listed
 * options is of unknown group, so a plan cannot replace it. A vocabulary is the union of the
 * catalogs seen for one category; merged under the current catalog it restores the group of
 * every option that was ever listed.
 */

/**
 * `current` with each option of `remembered` it does not list appended to the group of the same
 * name (a new group when it has none). Appended options carry no count: hit counts belong to the
 * filter state they were served for. Catalogs of different categories are not merged.
 */
export function mergeCatalogs(current: FilterCatalog, remembered: FilterCatalog): FilterCatalog {
  if (current.categoryId !== remembered.categoryId) return current;
  const listed = new Set(current.groups.flatMap((g) => g.filters.map((f) => f.filterId)));
  const groups = new Map<string, FilterGroup>(
    current.groups.map((g) => [groupKey(g.name), { ...g, filters: [...g.filters] }]),
  );
  for (const group of remembered.groups) {
    const extra = group.filters
      .filter((f) => !listed.has(f.filterId))
      .map(({ filterId, label }) => ({ filterId, label }));
    if (extra.length === 0) continue;
    for (const f of extra) listed.add(f.filterId);
    const target = groups.get(groupKey(group.name));
    if (target === undefined) groups.set(groupKey(group.name), { ...group, filters: extra });
    else target.filters.push(...extra);
  }
  return { ...current, groups: [...groups.values()] };
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
