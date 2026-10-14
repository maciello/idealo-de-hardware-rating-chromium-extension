import { groupKey } from "../group-key";
import { parseLabel } from "./label-parser";
import type { NumericFacet } from "./model";
import { FACETS_BY_GROUP_NAME } from "./vocabulary";

/** One stated quantity in the facet's canonical unit ("1.000 GB" under "SSD-Speicher" is 1000 GB). */
export interface Measure {
  readonly facet: NumericFacet;
  readonly value: number;
}

/**
 * Reads a single stated value under a filter-group name, the way a datasheet row or a listing tile
 * states it. Ranges ("bis 8 GB"), unknown groups, non-numeric groups and foreign units give null.
 */
export function measureOf(groupName: string, value: string): Measure | null {
  const spec = FACETS_BY_GROUP_NAME[groupKey(groupName)];
  if (spec?.kind !== "numeric") return null;
  const parsed = parseLabel(value, spec);
  if (parsed === null || !parsed.point || !Number.isFinite(parsed.min)) return null;
  return { facet: spec.facet, value: parsed.min };
}
