import { z } from "zod";
import { LABEL_FACETS, MODEL_FACETS, NUMERIC_FACETS } from "../catalog";
import { PriceRangeSchema } from "../query";

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
export type ModelRequirement = z.infer<typeof ModelRequirementSchema>;
export type Requirements = z.infer<typeof RequirementsSchema>;
export type RequirementsInput = z.input<typeof RequirementsSchema>;
export type Bound = z.infer<typeof BoundSchema>;
