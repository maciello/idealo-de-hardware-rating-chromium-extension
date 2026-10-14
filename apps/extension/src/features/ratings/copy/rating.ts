import type { PointsMetric, RatingMetric } from "@idealo-hw/hw-bench";

const POINTS_NAMES: Readonly<Record<PointsMetric, string>> = {
  cpu_mark: "CPU Mark",
  g3d_mark: "G3D Mark",
};

/** The sentence a rating's tooltip is made of; the functions take figures already formatted. */
export const RATING_TEXT = {
  /** What the score is called when it is the point of the sentence. */
  scoreNames: {
    cpu_mark: "CPU Mark (multi-thread)",
    cpu_single: "single-thread rating",
    g3d_mark: "G3D Mark",
  } satisfies Readonly<Record<RatingMetric, string>>,
  /** What the score is called when it is compared or ranked. */
  pointsNames: POINTS_NAMES,
  /** The plural noun of the compared group, by metric and device class. */
  groupNouns: {
    cpu_mark: { laptop: "laptop CPUs", desktop: "desktop CPUs" },
    g3d_mark: { laptop: "laptop GPUs", desktop: "desktop GPUs" },
  } satisfies Readonly<Record<PointsMetric, Readonly<Record<"laptop" | "desktop", string>>>>,

  score: (name: string, subject: string, value: string): string =>
    `PassMark ${name} of ${subject}: ${value}.`,
  perEuro: (score: string, name: string, priceEur: string, points: string): string =>
    `${score} ${name} for ${priceEur} EUR = ${points} points per euro.`,
  cohortPercentile: (
    name: string,
    score: string,
    percentile: string,
    size: string,
    noun: string,
    cohort: string,
  ): string =>
    `${name} ${score} is at the ${percentile}th percentile of ${size} ${noun}${cohort} in the imported snapshot.`,
  listingPercentile: (name: string, score: string, percentile: string, size: number): string =>
    `${name} ${score} ranks at the ${percentile}th percentile of ${size} products in this listing.`,
  /** How the limits of a cohort read; each part is led by a space and parts are joined by a comma. */
  cohort: {
    sinceYear: (year: number): string => `first seen ${year} or later`,
    minScore: (score: string): string => `scoring at least ${score}`,
    lead: " ",
    joiner: ",",
  },
  /** Added to the tooltips of a GPU rated by the weakest of several cards. */
  lowerBound: (cards: number, names: string): string =>
    ` Lower bound: the text matches ${cards} cards (${names}); this is the weakest.`,
  nameSeparator: ", ",

  /** Short badge text of a rating that has no text of its own on the chip. */
  display: {
    perEuro: (points: string): string => `${points}/€`,
    percentile: (rounded: number): string => `P${rounded}`,
  },
} as const;
