import type { FilterId, ManufacturerId } from "../ids";
import type { FilterCatalog, FilterGroup, FilterOption, Manufacturer } from "./model";

export interface FilterLookup {
  group: FilterGroup;
  filter: FilterOption;
  groupPosition: number;
}

export interface CatalogIndex {
  readonly catalog: FilterCatalog;
  filter(id: FilterId): FilterLookup | undefined;
  group(attributeId: string): FilterGroup | undefined;
  manufacturer(id: ManufacturerId): Manufacturer | undefined;
  manufacturerBySearchFilterId(id: FilterId): Manufacturer | undefined;
}

const indexCache = new WeakMap<FilterCatalog, CatalogIndex>();

/** O(1) lookups; memoized per catalog object, so treat catalogs as immutable. First occurrence wins on duplicate ids. */
export function indexCatalog(catalog: FilterCatalog): CatalogIndex {
  const cached = indexCache.get(catalog);
  if (cached) return cached;

  const filters = new Map<FilterId, FilterLookup>();
  const groups = new Map<string, FilterGroup>();
  catalog.groups.forEach((group, groupPosition) => {
    if (!groups.has(group.attributeId)) groups.set(group.attributeId, group);
    for (const filter of group.filters) {
      if (!filters.has(filter.filterId))
        filters.set(filter.filterId, { group, filter, groupPosition });
    }
  });
  const manufacturers = new Map<ManufacturerId, Manufacturer>();
  const bySearchFilter = new Map<FilterId, Manufacturer>();
  for (const m of catalog.manufacturers) {
    if (!manufacturers.has(m.manufacturerId)) manufacturers.set(m.manufacturerId, m);
    if (m.searchFilterId !== undefined && !bySearchFilter.has(m.searchFilterId)) {
      bySearchFilter.set(m.searchFilterId, m);
    }
  }

  const index: CatalogIndex = {
    catalog,
    filter: (id) => filters.get(id),
    group: (attributeId) => groups.get(attributeId),
    manufacturer: (id) => manufacturers.get(id),
    manufacturerBySearchFilterId: (id) => bySearchFilter.get(id),
  };
  indexCache.set(catalog, index);
  return index;
}
