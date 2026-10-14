import type { PointsMetric, Rating, RatingCohort, RatingGroup } from "../strategy";
import { percentileRank } from "./rank";

export interface CohortPercentileInput {
  readonly strategyId: string;
  readonly metric: PointsMetric;
  readonly score: number;
  readonly sorted: readonly number[];
  /** The group `sorted` was built from. */
  readonly group: RatingGroup;
  /** What the group's records were limited to. */
  readonly cohort: RatingCohort;
}

/** Rating of `score` within a cohort's sorted scores; null for an empty cohort. Shared by every metric. */
export function cohortPercentileRating(input: CohortPercentileInput): Rating | null {
  const value = percentileRank(input.sorted, input.score);
  if (value === null) return null;
  return {
    kind: "percentile",
    strategyId: input.strategyId,
    value,
    metric: input.metric,
    score: input.score,
    sampleSize: input.sorted.length,
    group: input.group,
    cohort: input.cohort,
  };
}
