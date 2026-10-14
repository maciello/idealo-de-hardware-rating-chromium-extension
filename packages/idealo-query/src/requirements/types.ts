import type { FacetOption, LabelFacet, ModelFacet, NumericFacet } from "../catalog";
import type { IdealoQuery } from "../query";

export type FacetPlanStatus =
  /** Filter ids selected; together they guarantee the requirement. */
  | "applied"
  /** Every listed option meets it; no filter needed. */
  | "unconstrained"
  /** No listed option meets it; the category cannot satisfy the requirement via filters. */
  | "unsatisfiable"
  /** The category has no single group for this facet; check it on the page instead. */
  | "not_expressible";

export interface FacetPlan {
  readonly facet: NumericFacet | ModelFacet | LabelFacet;
  readonly status: FacetPlanStatus;
  readonly reason?: "no_group" | "split_across_groups";
  readonly attributeId?: string;
  readonly selected: readonly FacetOption[];
  /** Options that meet the requirement only in part (bucket "8 bis 10 h" for min 9); not selected. */
  readonly partial: readonly FacetOption[];
  /** Option labels without a measure or benchmark match; not selected. */
  readonly unmatched: readonly string[];
  /** Requested labels the group does not list. */
  readonly unknownLabels: readonly string[];
  /** idealo lists at most 100 options per group; a model requirement then excludes unlisted models. */
  readonly capped: boolean;
}

export interface RequirementsPlan {
  /** `base` with the planned groups' filters replaced and the price set. */
  readonly query: IdealoQuery;
  readonly facets: readonly FacetPlan[];
  /**
   * Upper bound on matching products from the catalog's hit counts: groups AND, options within a
   * group OR (assumption csr.filter-ids); null when no group is applied or counts are missing.
   */
  readonly hitsUpperBound: number | null;
}
