import { quantileRankSorted } from "simple-statistics";

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
