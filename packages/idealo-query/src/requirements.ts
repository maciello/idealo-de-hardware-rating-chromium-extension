import { z } from "zod";
import type { FilterCatalog } from "./catalog";
import {
  allAtLeast,
  allAtMost,
  type FacetGroup,
  type FacetOption,
  facetsOf,
  LABEL_FACETS,
  type LabelFacet,
  MODEL_FACETS,
  type ModelFacet,
  NUMERIC_FACETS,
  type NumericFacet,
} from "./facets";
import type { FilterId } from "./ids";
import { type IdealoQuery, normalizeQuery, PriceRangeSchema } from "./model";

/**
 * Hardware requirements as a user states them (sliders, chips), independent of idealo's per-category
 * filter ids. `planRequirements` turns them into filter ids of one category's catalog.
 */
const BoundSchema = z
  .object({ min: z.number().finite().optional(), max: z.number().finite().optional() })
  .refine((b) => b.min !== undefined || b.max !== undefined, "bound needs min or max")
  .refine((b) => b.min === undefined || b.max === undefined || b.min <= b.max, "min > max");

const NumericFacetSchema = z.enum(NUMERIC_FACETS);
const ModelFacetSchema = z.enum(MODEL_FACETS);
const LabelFacetSchema = z.enum(LABEL_FACETS);

/** Benchmark metrics a ModelScorer reports, keyed by name (e.g. cpu_mark, cpu_single, g3d). */
const ModelRequirementSchema = z.object({
  minimums: z.record(z.string().min(1), z.number().nonnegative()),
  /** "all": a model must meet every minimum; "any": one suffices. */
  combine: z.enum(["all", "any"]).default("all"),
});

export const RequirementsSchema = z.object({
  numeric: z.partialRecord(NumericFacetSchema, BoundSchema).default({}),
  models: z.partialRecord(ModelFacetSchema, ModelRequirementSchema).default({}),
  /** Accepted option labels per facet, compared case-insensitively ("DDR5", "LPDDR5X"). */
  labels: z.partialRecord(LabelFacetSchema, z.array(z.string().min(1)).min(1)).default({}),
  price: PriceRangeSchema.optional(),
});
export type Requirements = z.infer<typeof RequirementsSchema>;
export type RequirementsInput = z.input<typeof RequirementsSchema>;

/**
 * Port to a benchmark source. Returns the metrics of the model an option label names, or null when
 * the label resolves to no single model. For a label covering variants ("RTX 5060 Ti" = 8 GB and
 * 16 GB) it must return the weakest variant's metrics so a selection never overstates a minimum.
 */
export type ModelScorer = (
  facet: ModelFacet,
  label: string,
) => Readonly<Record<string, number>> | null;

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

/** Observed per-group option cap (ADR 0008, har-2026-10-14-categories). */
const GROUP_OPTION_CAP = 100;

const empty = { selected: [], partial: [], unmatched: [], unknownLabels: [] } as const;

const decide = (
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

function planNumeric(
  facet: NumericFacet,
  group: Extract<FacetGroup, { kind: "numeric" }>,
  bound: z.infer<typeof BoundSchema>,
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

function planModel(
  facet: ModelFacet,
  group: Extract<FacetGroup, { kind: "model" }>,
  requirement: z.infer<typeof ModelRequirementSchema>,
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

function planLabel(
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

const hitsOf = (options: readonly FacetOption[]): number | null =>
  options.every((o) => o.count !== undefined)
    ? options.reduce((sum, o) => sum + (o.count ?? 0), 0)
    : null;

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

  for (const [facet, bound] of Object.entries(requirements.numeric) as [
    NumericFacet,
    z.infer<typeof BoundSchema>,
  ][])
    plan(
      facet,
      (g): g is Extract<FacetGroup, { kind: "numeric" }> => g.kind === "numeric",
      (g, alone) => planNumeric(facet, g, bound, alone),
    );
  for (const [facet, requirement] of Object.entries(requirements.models) as [
    ModelFacet,
    z.infer<typeof ModelRequirementSchema>,
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
