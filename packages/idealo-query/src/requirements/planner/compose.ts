import type { FacetGroup } from "../../catalog";
import type { FilterId } from "../../ids";
import { type IdealoQuery, normalizeQuery, type PriceRange } from "../../query";
import type { FacetPlan } from "../types";
import { hitsOf } from "./hits";

/**
 * `base` with the filters of every planned group replaced by the plans' selections, and the price
 * set when the requirements name one. Groups the plan does not touch keep their filters from `base`.
 */
export function composeQuery(
  base: IdealoQuery,
  price: PriceRange | undefined,
  groups: readonly FacetGroup[],
  facets: readonly FacetPlan[],
): IdealoQuery {
  const planned = new Set(facets.filter((f) => f.status !== "not_expressible").map((f) => f.facet));
  const replaced = new Set<string>(
    groups
      .filter((g) => planned.has(g.facet))
      .flatMap((g) => g.group.filters.map((f) => f.filterId)),
  );
  const filterIds: FilterId[] = [
    ...base.filterIds.filter((id) => !replaced.has(id)),
    ...facets
      .filter((f) => f.status === "applied")
      .flatMap((f) => f.selected.map((o) => o.filterId)),
  ];
  return normalizeQuery({ ...base, filterIds, ...(price === undefined ? {} : { price }) });
}

/**
 * Upper bound on matching products: groups AND, options within a group OR (assumption
 * csr.filter-ids), so the smallest applied group bounds the result. Null when no group is applied
 * or a count is missing.
 */
export function hitsUpperBoundOf(facets: readonly FacetPlan[]): number | null {
  const groupHits = facets.filter((f) => f.status === "applied").map((f) => hitsOf(f.selected));
  const knownHits = groupHits.filter((h): h is number => h !== null);
  return groupHits.length === 0 || knownHits.length < groupHits.length
    ? null
    : Math.min(...knownHits);
}
