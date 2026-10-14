import { formatInteger } from "../format";
import type { Rating, RatingStrategy } from "./port";

export interface ScoreStrategySpec<I> {
  readonly id: string;
  readonly label: string;
  /** Names the score in the explanation: "PassMark <what> of <subject>: <score>.". */
  readonly what: string;
  readonly subject: (input: I) => string;
  readonly score: (input: I) => number;
}

/** The raw benchmark value as a rating; one definition for every metric (CPU Mark, G3D Mark). */
export const scoreStrategy = <I>(spec: ScoreStrategySpec<I>): RatingStrategy<I> => ({
  id: spec.id,
  label: spec.label,
  rate(input): Rating {
    const value = spec.score(input);
    return {
      strategyId: spec.id,
      value,
      display: formatInteger(value),
      explanation: `PassMark ${spec.what} of ${spec.subject(input)}: ${formatInteger(value)}.`,
    };
  },
});
