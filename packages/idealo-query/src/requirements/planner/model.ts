import type { FacetGroup, FacetOption, ModelFacet } from "../../catalog";
import type { ModelScorer } from "../port";
import type { ModelRequirement } from "../schema";
import type { FacetPlan } from "../types";
import { decide } from "./decide";

export function planModel(
  facet: ModelFacet,
  group: Extract<FacetGroup, { kind: "model" }>,
  requirement: ModelRequirement,
  scorer: ModelScorer,
  alone: boolean,
): FacetPlan {
  const minimums = Object.entries(requirement.minimums);
  const selected: FacetOption[] = [];
  const unmatched: string[] = [];
  for (const option of group.group.filters) {
    const scores = scorer(facet, option.label);
    if (scores === null) {
      unmatched.push(option.label);
      continue;
    }
    const passes = minimums.map(([metric, min]) => (scores[metric] ?? -1) >= min);
    const ok = requirement.combine === "all" ? passes.every(Boolean) : passes.some(Boolean);
    if (ok) selected.push({ ...option, interval: null });
  }
  return decide(facet, group, selected, { partial: [], unmatched, unknownLabels: [] }, alone);
}
