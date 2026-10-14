import {
  allAtLeast,
  allAtMost,
  type FacetGroup,
  type FacetOption,
  type NumericFacet,
} from "../../catalog";
import type { Bound } from "../schema";
import type { FacetPlan } from "../types";
import { decide } from "./decide";

export function planNumeric(
  facet: NumericFacet,
  group: Extract<FacetGroup, { kind: "numeric" }>,
  bound: Bound,
  alone: boolean,
): FacetPlan {
  const meets = (o: FacetOption): boolean =>
    o.interval !== null &&
    (bound.min === undefined || allAtLeast(o.interval, bound.min)) &&
    (bound.max === undefined || allAtMost(o.interval, bound.max));
  const overlaps = (o: FacetOption): boolean =>
    o.interval !== null &&
    (bound.min === undefined || o.interval.max > bound.min) &&
    (bound.max === undefined || o.interval.min < bound.max);
  return decide(
    facet,
    group,
    group.options.filter(meets),
    {
      partial: group.options.filter((o) => !meets(o) && overlaps(o)),
      unmatched: group.options.filter((o) => o.interval === null).map((o) => o.label),
      unknownLabels: [],
    },
    alone,
  );
}
