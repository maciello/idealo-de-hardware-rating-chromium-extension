import { z } from "zod";
import { HardSchema } from "./hard";
import { isBuiltinMetric, METRICS } from "./metrics";
import { snakeKey } from "./vocab";

const LensSchema = z.object({
  id: z.string().min(1).describe("Short id that candidates list in found_by."),
  label: z.string().min(1).describe("What this search angle looked for, in plain words."),
});

const CustomMetricSchema = z.object({
  key: snakeKey("Key of a figure in the candidates' extra map. Must not be a built-in metric."),
  direction: z.enum(["higher", "lower"]).describe("Which end of the range is better."),
  label: z.string().min(1).describe("Column title and unit for the report, e.g. Sensor (MP)."),
});

const BASE = z.object({
  top_n: z
    .number()
    .int()
    .min(1)
    .max(25)
    .default(5)
    .describe("How many ranked candidates the report details (1..25)."),
  budget_eur: z
    .object({
      min: z
        .number()
        .optional()
        .describe("Candidates whose best offer total is below this are excluded."),
      max: z
        .number()
        .describe("Hard ceiling on the best offer total (price plus shipping) in euro."),
    })
    .describe("Budget range for the best offer total, in euro."),
  hard: HardSchema.default({ custom: [] }),
  custom_metrics: z
    .array(CustomMetricSchema)
    .default([])
    .describe(
      "Extra numeric metrics read from each candidate's extra map. They score, stand out and filter like built-in metrics.",
    ),
  weights: z
    .record(z.string(), z.number().min(0).max(5))
    .default({})
    .describe(
      `Score weight per metric, 0..5. Keys are built-in metrics (${METRICS.join(", ")}) or keys declared in custom_metrics. Missing or 0 is ignored in the score. Standouts are still reported for every metric.`,
    ),
  must_have_features: z
    .array(z.string())
    .default([])
    .describe(
      "Feature names a candidate must have (candidate.features or a derived laptop feature).",
    ),
  feature_weights: z
    .record(snakeKey("Feature name."), z.number().min(0).max(5))
    .default({})
    .describe("Score weight per feature, 0..5. A feature scores 1 when present and 0 when not."),
  lenses: z
    .array(LensSchema)
    .default([])
    .describe("The search angles the agent ran. Candidates reference the ids in found_by."),
});

export const WantsSchema = BASE.superRefine((wants, ctx) => {
  const declared = new Set(wants.custom_metrics.map((metric) => metric.key));
  wants.custom_metrics.forEach((metric, index) => {
    if (isBuiltinMetric(metric.key)) {
      ctx.addIssue({
        code: "custom",
        path: ["custom_metrics", index, "key"],
        message: `"${metric.key}" is a built-in metric; pick another key`,
      });
    }
  });
  for (const key of Object.keys(wants.weights)) {
    if (!isBuiltinMetric(key) && !declared.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["weights", key],
        message: `weight key "${key}" is neither a built-in metric (${METRICS.join(", ")}) nor declared in custom_metrics`,
      });
    }
  }
}).describe("What the shopper wants: budget, hard filters, score weights and the search angles.");

export type Wants = z.output<typeof WantsSchema>;
export type Hard = Wants["hard"];
export type CustomMetricDecl = Wants["custom_metrics"][number];
export type Lens = Wants["lenses"][number];
