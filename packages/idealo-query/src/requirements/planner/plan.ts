import { type FilterCatalog, facetsOf } from "../../catalog";
import type { IdealoQuery } from "../../query";
import type { ModelScorer } from "../port";
import { type RequirementsInput, RequirementsSchema } from "../schema";
import type { RequirementsPlan } from "../types";
import { composeQuery, hitsUpperBoundOf } from "./compose";
import { planFacets } from "./facet-plans";

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
  const facets = planFacets(requirements, groups, scorer);
  return {
    query: composeQuery(base, requirements.price, groups, facets),
    facets,
    hitsUpperBound: hitsUpperBoundOf(facets),
  };
}
