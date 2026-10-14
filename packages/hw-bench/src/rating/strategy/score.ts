import type { Rating, RatingMetric, RatingStrategy } from "./port";

export interface ScoreStrategySpec<I> {
  readonly id: string;
  readonly label: string;
  readonly metric: RatingMetric;
  readonly subject: (input: I) => string;
  readonly score: (input: I) => number;
}

/** The raw benchmark value as a rating; one definition for every metric (CPU Mark, G3D Mark). */
export const scoreStrategy = <I>(spec: ScoreStrategySpec<I>): RatingStrategy<I> => ({
  id: spec.id,
  label: spec.label,
  rate(input): Rating {
    return {
      kind: "score",
      strategyId: spec.id,
      value: spec.score(input),
      metric: spec.metric,
      subject: spec.subject(input),
    };
  },
});
