import type { PointsMetric, Rating, RatingStrategy } from "./port";

export interface ValuePerEuroSpec<I> {
  readonly id: string;
  /** Name of the score, e.g. "CPU Mark"; the strategy's label is "<name> per euro". */
  readonly name: string;
  readonly metric: PointsMetric;
  readonly score: (input: I) => number;
}

/** Benchmark points per euro of the listing price; null without a usable price. One definition for every metric. */
export const valuePerEuroStrategy = <I extends { readonly priceEur?: number }>(
  spec: ValuePerEuroSpec<I>,
): RatingStrategy<I> => ({
  id: spec.id,
  label: `${spec.name} per euro`,
  rate(input): Rating | null {
    const { priceEur } = input;
    if (priceEur === undefined || !Number.isFinite(priceEur) || priceEur <= 0) return null;
    const score = spec.score(input);
    return {
      kind: "per_euro",
      strategyId: spec.id,
      value: score / priceEur,
      metric: spec.metric,
      score,
      priceEur,
    };
  },
});
