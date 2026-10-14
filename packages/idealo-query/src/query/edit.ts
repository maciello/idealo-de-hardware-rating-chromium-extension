import { type FilterCatalog, indexCatalog } from "../catalog";
import type { FilterId, ManufacturerId } from "../ids";
import {
  type IdealoQuery,
  MAX_OFFSET,
  normalizeQuery,
  type PriceRange,
  type SortKey,
} from "./model";

const sameQuery = (a: IdealoQuery, b: IdealoQuery): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/** Applies a patch; if it changes anything, the result starts at page one. */
function commit(query: IdealoQuery, patch: Partial<IdealoQuery>): IdealoQuery {
  const current = normalizeQuery(query);
  const { offset: _offset, ...changed } = { ...current, ...patch };
  const next = normalizeQuery(changed);
  const { offset: _kept, ...currentWithoutOffset } = current;
  return sameQuery(next, normalizeQuery(currentWithoutOffset)) ? current : next;
}

export function resetPaging(query: IdealoQuery): IdealoQuery {
  const { offset: _offset, ...rest } = normalizeQuery(query);
  return rest;
}

export function setOffset(query: IdealoQuery, offset: number): IdealoQuery {
  return normalizeQuery({
    ...query,
    offset: Math.min(MAX_OFFSET, Math.max(0, Math.trunc(offset))),
  });
}

const without = <T>(items: readonly T[], remove: readonly T[]): T[] =>
  items.filter((item) => !remove.includes(item));

export function addFilters(query: IdealoQuery, ids: readonly FilterId[]): IdealoQuery {
  return commit(query, { filterIds: [...query.filterIds, ...ids] });
}

export function removeFilters(query: IdealoQuery, ids: readonly FilterId[]): IdealoQuery {
  return commit(query, { filterIds: without(query.filterIds, ids) });
}

export function toggleFilter(query: IdealoQuery, id: FilterId): IdealoQuery {
  return query.filterIds.includes(id) ? removeFilters(query, [id]) : addFilters(query, [id]);
}

export function addManufacturers(query: IdealoQuery, ids: readonly ManufacturerId[]): IdealoQuery {
  return commit(query, { manufacturerIds: [...query.manufacturerIds, ...ids] });
}

export function removeManufacturers(
  query: IdealoQuery,
  ids: readonly ManufacturerId[],
): IdealoQuery {
  return commit(query, { manufacturerIds: without(query.manufacturerIds, ids) });
}

/** Unknown attributeId or a catalog of another category leaves the query unchanged. */
export function clearGroup(
  query: IdealoQuery,
  catalog: FilterCatalog,
  attributeId: string,
): IdealoQuery {
  if (catalog.categoryId !== query.categoryId) return normalizeQuery(query);
  const group = indexCatalog(catalog).group(attributeId);
  if (!group) return normalizeQuery(query);
  return removeFilters(
    query,
    group.filters.map((f) => f.filterId),
  );
}

export function setPrice(query: IdealoQuery, price: PriceRange | undefined): IdealoQuery {
  return commit(query, { price });
}

export function setSort(query: IdealoQuery, sort: SortKey | undefined): IdealoQuery {
  return commit(query, { sort });
}

export function setText(query: IdealoQuery, text: string | undefined): IdealoQuery {
  return commit(query, { text });
}

/**
 * Moves manufacturers that the catalog maps to a web filter id (searchFilterId, assumption mcp.H2)
 * into filterIds. Manufacturers without a mapping stay in manufacturerIds.
 */
export function foldManufacturers(
  query: IdealoQuery,
  catalog: FilterCatalog | undefined,
): IdealoQuery {
  const normalized = normalizeQuery(query);
  if (!catalog || catalog.categoryId !== normalized.categoryId) return normalized;
  const index = indexCatalog(catalog);
  const folded: FilterId[] = [];
  const kept: ManufacturerId[] = [];
  for (const id of normalized.manufacturerIds) {
    const searchFilterId = index.manufacturer(id)?.searchFilterId;
    if (searchFilterId === undefined) kept.push(id);
    else folded.push(searchFilterId);
  }
  if (folded.length === 0) return normalized;
  return normalizeQuery({
    ...normalized,
    filterIds: [...normalized.filterIds, ...folded],
    manufacturerIds: kept,
  });
}
