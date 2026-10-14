import { type FacetGroup, groupKey } from "../../catalog";
import type { FacetPlan } from "../types";
import { hitsOf } from "./hits";

export interface Candidate {
  readonly group: FacetGroup;
  readonly plan: FacetPlan;
}

/**
 * The plan to use when several groups of one facet can meet a requirement. Groups AND, so their
 * options cannot be combined; only groups of the same name can stand in for one another (idealo
 * lists "Grafikspeicher" twice, once with a "Shared Memory" option), where the group with the
 * fewest options without a measure wins, then the one covering the most products. Groups of
 * different names (storage in GB and TB groups) are complementary: undefined.
 */
export function chooseAlternative(candidates: readonly Candidate[]): FacetPlan | undefined {
  const [first, ...rest] = candidates;
  if (first === undefined) return undefined;
  if (rest.length === 0) return first.plan;
  const name = groupKey(first.group.group.name);
  if (rest.some((c) => groupKey(c.group.group.name) !== name)) return undefined;
  const cost = ({ plan }: Candidate): number => plan.unmatched.length;
  const coverage = ({ plan }: Candidate): number => hitsOf(plan.selected) ?? 0;
  return candidates.reduce((best, next) =>
    cost(next) < cost(best) || (cost(next) === cost(best) && coverage(next) > coverage(best))
      ? next
      : best,
  ).plan;
}
