import type { Rating, RatingCohort } from "@idealo-hw/hw-bench";
import { formatDecimal, formatInteger } from "../../../../ui/format";
import { RATING_TEXT as T } from "../../copy";

type Percentile = Extract<Rating, { kind: "percentile" }>;

const cohortText = ({ sinceYear, minScore }: RatingCohort): string =>
  [
    sinceYear === null ? null : T.cohort.sinceYear(sinceYear),
    minScore === null ? null : T.cohort.minScore(formatInteger(minScore)),
  ]
    .filter((part) => part !== null)
    .map((part) => `${T.cohort.lead}${part}`)
    .join(T.cohort.joiner);

const percentileText = (rating: Percentile): string => {
  const name = T.pointsNames[rating.metric];
  const score = formatInteger(rating.score);
  const percentile = formatInteger(rating.value);
  if (rating.group === "listing" || rating.cohort === null) {
    return T.listingPercentile(name, score, percentile, rating.sampleSize);
  }
  return T.cohortPercentile(
    name,
    score,
    percentile,
    formatInteger(rating.sampleSize),
    T.groupNouns[rating.metric][rating.group],
    cohortText(rating.cohort),
  );
};

/** The sentence under a rating: what was measured and what it was compared with. */
export function ratingExplanation(rating: Rating): string {
  switch (rating.kind) {
    case "score":
      return T.score(T.scoreNames[rating.metric], rating.subject, formatInteger(rating.value));
    case "per_euro":
      return T.perEuro(
        formatInteger(rating.score),
        T.pointsNames[rating.metric],
        formatDecimal(rating.priceEur),
        formatDecimal(rating.value),
      );
    case "percentile":
      return percentileText(rating);
  }
}

/** The names of the cards a lower-bound GPU rating could be, as the tooltip adds them. */
export const lowerBoundNote = (variants: readonly string[]): string =>
  T.lowerBound(variants.length, variants.join(T.nameSeparator));
