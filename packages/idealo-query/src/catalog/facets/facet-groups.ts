import { groupKey } from "../group-key";
import type { FilterCatalog, FilterGroup, FilterOption } from "../model";
import type { Interval } from "./interval";
import { parseLabel } from "./label-parser";
import type { LabelFacet, ModelFacet, NumericFacet, NumericSpec } from "./model";
import { FACETS_BY_GROUP_NAME } from "./vocabulary";

export interface FacetOption extends FilterOption {
  /** Null when the label is not a measure ("Shared Memory", "ohne Grafikkarte"). */
  readonly interval: Interval | null;
}

export type FacetGroup =
  | {
      readonly kind: "numeric";
      readonly facet: NumericFacet;
      readonly group: FilterGroup;
      readonly options: readonly FacetOption[];
    }
  | { readonly kind: "model"; readonly facet: ModelFacet; readonly group: FilterGroup }
  | { readonly kind: "label"; readonly facet: LabelFacet; readonly group: FilterGroup };

function numericOptions(group: FilterGroup, spec: NumericSpec): FacetOption[] {
  const parsed = group.filters.map((filter) => ({ filter, label: parseLabel(filter.label, spec) }));
  const pointValues = parsed
    .flatMap(({ label }) => (label?.point ? [label.min] : []))
    .sort((a, b) => a - b);
  return parsed.map(({ filter, label }) => {
    if (label === null) return { ...filter, interval: null };
    if (spec.points === "bucket" && label.point) {
      const next = pointValues.find((v) => v > label.min);
      return {
        ...filter,
        interval: { min: label.min, max: next ?? label.min, maxExclusive: next !== undefined },
      };
    }
    return {
      ...filter,
      interval: { min: label.min, max: label.max, maxExclusive: label.maxExclusive },
    };
  });
}

/**
 * Annotates the catalog's groups with their facet. Groups with an unknown name are omitted; groups
 * sharing a facet (storage split into GB and TB groups) are returned separately in catalog order.
 */
export function facetsOf(catalog: FilterCatalog): FacetGroup[] {
  return catalog.groups.flatMap((group): FacetGroup[] => {
    const spec = FACETS_BY_GROUP_NAME[groupKey(group.name)];
    if (spec === undefined) return [];
    if (spec.kind === "numeric")
      return [{ kind: "numeric", facet: spec.facet, group, options: numericOptions(group, spec) }];
    return [{ ...spec, group }];
  });
}
