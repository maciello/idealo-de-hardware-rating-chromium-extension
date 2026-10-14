import type { GpuBenchmarkRecord } from "../../benchmark";
import type { FormFactor } from "../../identity";
import { gpuScoreBounds, type MatchResult } from "../../matcher";
import type { GpuRatingInput, GpuRatingStrategy, Rating } from "../strategy";

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
 * The result says so with `lowerBound` and `variants`, which belong to every rating in it. Null for no_match.
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
  const ratings = strategies.flatMap((strategy) => strategy.rate(input) ?? []);
  return { record, lowerBound, variants: bounds.variants, formFactor, ratings };
}
