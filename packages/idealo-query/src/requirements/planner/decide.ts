import type { FacetGroup, FacetOption } from "../../catalog";
import type { FacetPlan, FacetPlanStatus } from "../types";

/** Observed per-group option cap (ADR 0008, har-2026-10-14-categories). */
const GROUP_OPTION_CAP = 100;

export const decide = (
  facet: FacetPlan["facet"],
  group: FacetGroup,
  selected: FacetOption[],
  rest: Omit<FacetPlan, "facet" | "status" | "selected" | "attributeId" | "capped">,
  alone: boolean,
): FacetPlan => {
  const total = group.group.filters.length;
  const status: FacetPlanStatus =
    selected.length === 0
      ? "unsatisfiable"
      : alone && selected.length === total
        ? "unconstrained"
        : "applied";
  return {
    facet,
    status,
    attributeId: group.group.attributeId,
    selected: status === "applied" ? selected : [],
    capped: total >= GROUP_OPTION_CAP,
    ...rest,
  };
};
