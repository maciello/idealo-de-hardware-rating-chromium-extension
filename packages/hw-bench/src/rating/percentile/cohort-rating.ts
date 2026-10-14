import { formatInteger } from "../format";
import type { Rating } from "../strategy";
import { percentileDisplay, percentileRank } from "./rank";

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
