import type { GpuBenchmarkRecord } from "../benchmark/records";
import type { BenchmarkSnapshot } from "../benchmark/snapshot";
import type { FormFactor } from "../identity/form-factor";
import { gpuScoreBounds } from "../matcher/bounds";
import type { MatchResult } from "../matcher/matcher";
import type { CohortPolicy } from "./cohort";
import { gpuPercentile } from "./gpu-percentile";
import { scoreStrategy, valuePerEuroStrategy } from "./strategies";
import type { GpuRatingInput, GpuRatingStrategy, Rating } from "./strategy";

export const g3dScore: GpuRatingStrategy = scoreStrategy<GpuRatingInput>({
  id: "gpu_g3d_score",
  label: "G3D score",
  what: "G3D Mark",
  subject: ({ gpu }) => gpu.name,
  score: ({ gpu }) => gpu.g3dMark,
});

export const gpuValuePerEuro: GpuRatingStrategy = valuePerEuroStrategy<GpuRatingInput>({
  id: "gpu_value_per_euro",
  metric: "G3D Mark",
  score: ({ gpu }) => gpu.g3dMark,
});

/** Strategies that need no data beyond their input. */
export const gpuDefaultStrategies: readonly GpuRatingStrategy[] = [g3dScore, gpuValuePerEuro];

/** Defaults plus the percentile, which is built from the imported GPU snapshot. */
export const createGpuStrategies = (
  snapshot: BenchmarkSnapshot<GpuBenchmarkRecord>,
  cohortPolicy?: CohortPolicy,
): readonly GpuRatingStrategy[] => [...gpuDefaultStrategies, gpuPercentile(snapshot, cohortPolicy)];

export interface GpuMatchRating {
  /** The rated record: the matched one, or the weakest candidate (lowest G3D Mark) of an ambiguous match. */
  readonly record: GpuBenchmarkRecord;
  /** True when the match was ambiguous: every rating is a lower bound ("at least"), not the card's own value. */
  readonly lowerBound: boolean;
  /** Names of every record the match could be; one entry for a single match. */
  readonly variants: readonly string[];
  /** Form factor the ratings were computed for; "unknown" yields no percentile. */
  readonly formFactor: FormFactor;
  readonly ratings: readonly Rating[];
}

export interface GpuRateOptions {
  readonly formFactor?: FormFactor;
  readonly priceEur?: number;
}

/**
 * Rates a GPU match result like the CPU engine rates a CPU: a matched record as is, an ambiguous one by its weakest
 * candidate (`gpuScoreBounds` min), so a rating never promises more than the worst card the text could mean.
 * Ratings of an ambiguous match say so in their explanation. Null for no_match.
 */
export function rateGpuMatch(
  strategies: readonly GpuRatingStrategy[],
  match: MatchResult<GpuBenchmarkRecord>,
  options: GpuRateOptions = {},
): GpuMatchRating | null {
  const bounds = gpuScoreBounds(match);
  if (bounds === null) return null;
  const candidates =
    match.status === "matched" ? [match.record] : "candidates" in match ? match.candidates : [];
  const record = candidates.find((candidate) => candidate.g3dMark === bounds.g3dMark.min);
  if (record === undefined) return null;
  const lowerBound = match.status === "ambiguous";
  const formFactor = options.formFactor ?? "unknown";
  const input: GpuRatingInput = {
    gpu: record,
    formFactor,
    ...(options.priceEur === undefined ? {} : { priceEur: options.priceEur }),
  };
  const note = ` Lower bound: the text matches ${bounds.variants.length} cards (${bounds.variants.join(", ")}); this is the weakest.`;
  const ratings = strategies.flatMap((strategy) => {
    const rating = strategy.rate(input);
    if (rating === null) return [];
    return [lowerBound ? { ...rating, explanation: rating.explanation + note } : rating];
  });
  return { record, lowerBound, variants: bounds.variants, formFactor, ratings };
}
