import {
  type FacetGroup,
  type FilterCatalog,
  facetsOf,
  type LabelFacet,
  type ModelFacet,
  type NumericFacet,
} from "../../catalog";
import type { FilterId } from "../../ids";
import { type IdealoQuery, normalizeQuery } from "../../query";
import type { ModelScorer } from "../port";
import {
  type Bound,
  type ModelRequirement,
  type RequirementsInput,
  RequirementsSchema,
} from "../schema";
import type { FacetPlan, RequirementsPlan } from "../types";
import { hitsOf } from "./hits";
import { planLabel } from "./label";
import { planModel } from "./model";
import { planNumeric } from "./numeric";

const empty = { selected: [], partial: [], unmatched: [], unknownLabels: [] } as const;

/**
 * Plans `requirements` against one category's catalog. Pure; the catalog and `base` must share a
 * category. Groups the plan does not touch keep their filters from `base`.
 */
export function planRequirements(
  input: RequirementsInput,
  catalog: FilterCatalog,
  base: IdealoQuery,
  scorer: ModelScorer,
): RequirementsPlan {
  if (catalog.categoryId !== base.categoryId)
    throw new Error(`catalog ${catalog.categoryId} does not match query ${base.categoryId}`);
  const requirements = RequirementsSchema.parse(input);
  const groups = facetsOf(catalog);
  const groupsOf = (facet: FacetPlan["facet"]) => groups.filter((g) => g.facet === facet);

  const facets: FacetPlan[] = [];
  const plan = <G extends FacetGroup>(
    facet: FacetPlan["facet"],
    pick: (g: FacetGroup) => g is G,
    run: (group: G, alone: boolean) => FacetPlan,
  ): void => {
    const found = groupsOf(facet).filter(pick);
    const results = found.map((g) => run(g, found.length === 1));
    // Groups AND, so a facet split over groups (PC storage in GB and TB groups) is expressible
    // only when a single group holds every option that meets the requirement.
    const meeting = results.filter((r) => r.status !== "unsatisfiable");
    const chosen = meeting.length <= 1 ? (meeting[0] ?? results[0]) : undefined;
    facets.push(
      chosen ?? {
        facet,
        status: "not_expressible",
        reason: found.length === 0 ? "no_group" : "split_across_groups",
        capped: false,
        ...empty,
      },
    );
  };

  for (const [facet, bound] of Object.entries(requirements.numeric) as [NumericFacet, Bound][])
    plan(
      facet,
      (g): g is Extract<FacetGroup, { kind: "numeric" }> => g.kind === "numeric",
      (g, alone) => planNumeric(facet, g, bound, alone),
    );
  for (const [facet, requirement] of Object.entries(requirements.models) as [
    ModelFacet,
    ModelRequirement,
  ][])
    plan(
      facet,
      (g): g is Extract<FacetGroup, { kind: "model" }> => g.kind === "model",
      (g, alone) => planModel(facet, g, requirement, scorer, alone),
    );
  for (const [facet, wanted] of Object.entries(requirements.labels) as [LabelFacet, string[]][])
    plan(
      facet,
      (g): g is Extract<FacetGroup, { kind: "label" }> => g.kind === "label",
      (g, alone) => planLabel(facet, g, wanted, alone),
    );

  const planned = new Set(facets.filter((f) => f.status !== "not_expressible").map((f) => f.facet));
  const replaced = new Set<string>(
    groups
      .filter((g) => planned.has(g.facet))
      .flatMap((g) => g.group.filters.map((f) => f.filterId)),
  );
  const applied = facets.filter((f) => f.status === "applied");
  const filterIds: FilterId[] = [
    ...base.filterIds.filter((id) => !replaced.has(id)),
    ...applied.flatMap((f) => f.selected.map((o) => o.filterId)),
  ];
  const groupHits = applied.map((f) => hitsOf(f.selected));
  const hitsUpperBound =
    groupHits.length === 0 || groupHits.some((h) => h === null)
      ? null
      : Math.min(...(groupHits as number[]));

  return {
    query: normalizeQuery({
      ...base,
      filterIds,
      ...(requirements.price === undefined ? {} : { price: requirements.price }),
    }),
    facets,
    hitsUpperBound,
  };
}
