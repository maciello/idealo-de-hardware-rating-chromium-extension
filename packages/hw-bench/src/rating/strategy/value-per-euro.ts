import { formatDecimal, formatInteger } from "../format";
import type { Rating, RatingStrategy } from "./port";

export interface ValuePerEuroSpec<I> {
  readonly id: string;
  /** Name of the score, e.g. "CPU Mark"; the strategy's label is "<metric> per euro". */
  readonly metric: string;
  readonly score: (input: I) => number;
}

/** Benchmark points per euro of the listing price; null without a usable price. One definition for every metric. */
export const valuePerEuroStrategy = <I extends { readonly priceEur?: number }>(
  spec: ValuePerEuroSpec<I>,
): RatingStrategy<I> => ({
  id: spec.id,
  label: `${spec.metric} per euro`,
  rate(input): Rating | null {
    const { priceEur } = input;
    if (priceEur === undefined || !Number.isFinite(priceEur) || priceEur <= 0) return null;
    const score = spec.score(input);
    const value = score / priceEur;
    return {
      strategyId: spec.id,
      value,
      display: `${formatDecimal(value)}/€`,
      explanation: `${formatInteger(score)} ${spec.metric} for ${formatDecimal(priceEur)} EUR = ${formatDecimal(value)} points per euro.`,
    };
  },
});
