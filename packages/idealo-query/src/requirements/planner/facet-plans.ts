import type { FacetGroup } from "../../catalog";
import type { ModelScorer } from "../port";
import type { Requirements } from "../schema";
import type { FacetPlan } from "../types";
import { type Candidate, chooseAlternative } from "./alternatives";
import { planLabel } from "./label";
import { planModel } from "./model";
import { planNumeric } from "./numeric";

const EMPTY = { selected: [], partial: [], unmatched: [], unknownLabels: [] } as const;

/** Entries of a partial record keyed by a known union; `Object.entries` alone types the keys as `string`. */
function entriesOf<K extends string, V>(record: Partial<Record<K, V>>): [K, V][] {
  // SAFETY: requirements records are parsed by RequirementsSchema, whose partialRecord keys are members of K and whose present values are never undefined.
  return Object.entries(record) as [K, V][];
}

/**
 * One plan per facet the requirements name: numeric bounds first, then model minimums, then labels.
 * A facet that is not exactly one group's job is planned over all its groups and one result is chosen.
 */
export function planFacets(
  requirements: Requirements,
  groups: readonly FacetGroup[],
  scorer: ModelScorer,
): FacetPlan[] {
  const facets: FacetPlan[] = [];
  const plan = <G extends FacetGroup>(
    facet: FacetPlan["facet"],
    pick: (g: FacetGroup) => g is G,
    run: (group: G, alone: boolean) => FacetPlan,
  ): void => {
    const found = groups.filter((g) => g.facet === facet).filter(pick);
    const results = found.map((g) => run(g, found.length === 1));
    // Groups AND, so a facet split over groups (PC storage in GB and TB groups) is expressible
    // only when a single group holds every option that meets the requirement; groups of one name
    // are alternatives and chooseAlternative picks one.
    const meeting = found.flatMap((group, i): Candidate[] => {
      const result = results[i];
      return result === undefined || result.status === "unsatisfiable"
        ? []
        : [{ group, plan: result }];
    });
    const chosen = meeting.length === 0 ? results[0] : chooseAlternative(meeting);
    facets.push(
      chosen ?? {
        facet,
        status: "not_expressible",
        reason: found.length === 0 ? "no_group" : "split_across_groups",
        capped: false,
        ...EMPTY,
      },
    );
  };

  for (const [facet, bound] of entriesOf(requirements.numeric))
    plan(
      facet,
      (g): g is Extract<FacetGroup, { kind: "numeric" }> => g.kind === "numeric",
      (g, alone) => planNumeric(facet, g, bound, alone),
    );
  for (const [facet, requirement] of entriesOf(requirements.models))
    plan(
      facet,
      (g): g is Extract<FacetGroup, { kind: "model" }> => g.kind === "model",
      (g, alone) => planModel(facet, g, requirement, scorer, alone),
    );
  for (const [facet, wanted] of entriesOf(requirements.labels))
    plan(
      facet,
      (g): g is Extract<FacetGroup, { kind: "label" }> => g.kind === "label",
      (g, alone) => planLabel(facet, g, wanted, alone),
    );
  return facets;
}
