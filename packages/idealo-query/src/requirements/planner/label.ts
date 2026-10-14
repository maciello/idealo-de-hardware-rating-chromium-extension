import type { FacetGroup, LabelFacet } from "../../catalog";
import type { FacetPlan } from "../types";
import { decide } from "./decide";

export function planLabel(
  facet: LabelFacet,
  group: Extract<FacetGroup, { kind: "label" }>,
  wanted: readonly string[],
  alone: boolean,
): FacetPlan {
  const key = (s: string): string => s.trim().toLowerCase();
  const wantedKeys = new Set(wanted.map(key));
  const listed = new Set(group.group.filters.map((f) => key(f.label)));
  const selected = group.group.filters
    .filter((f) => wantedKeys.has(key(f.label)))
    .map((f) => ({ ...f, interval: null }));
  return decide(
    facet,
    group,
    selected,
    {
      partial: [],
      unmatched: [],
      unknownLabels: wanted.filter((w) => !listed.has(key(w))),
    },
    alone,
  );
}
