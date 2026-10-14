import { quantileRankSorted } from "simple-statistics";
import { formatInteger } from "./format";
import type { Rating } from "./strategy";

/**
 * Inclusive percentile rank in [0, 100] (simple-statistics quantileRankSorted): the top value scores 100,
 * tied values get their mean position. Non-decreasing in `value`. Returns null for an empty sample.
 */
export function percentileRank(sortedAscending: readonly number[], value: number): number | null {
  if (sortedAscending.length === 0) return null;
  return quantileRankSorted(sortedAscending as number[], value) * 100;
}

/** Badge text of a percentile rating, the one place the 0-100 value becomes display text: 77.4 -> "P77". */
export const percentileDisplay = (value: number): string => `P${Math.round(value)}`;

export interface CohortPercentileInput {
  readonly strategyId: string;
  /** Name of the ranked score, e.g. "CPU Mark", "G3D Mark". */
  readonly metric: string;
  readonly score: number;
  readonly sorted: readonly number[];
  /** Plural noun of the compared group, e.g. "laptop CPUs"; must name the group `sorted` was built from. */
  readonly noun: string;
  /** `describeCohort` output, e.g. " first seen 2022 or later". */
  readonly cohortText: string;
}

/** Rating of `score` within a cohort's sorted scores; null for an empty cohort. Shared by every metric. */
export function cohortPercentileRating(input: CohortPercentileInput): Rating | null {
  const value = percentileRank(input.sorted, input.score);
  if (value === null) return null;
  return {
    strategyId: input.strategyId,
    value,
    display: percentileDisplay(value),
    explanation: `${input.metric} ${formatInteger(input.score)} is at the ${formatInteger(value)}th percentile of ${formatInteger(input.sorted.length)} ${input.noun}${input.cohortText} in the imported snapshot.`,
  };
}
