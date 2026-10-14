import { z } from "zod";
import type { ReleaseDate } from "../benchmark";

/**
 * Which benchmark records form the reference distribution for percentile ratings.
 * PassMark `date` is the "first seen on charts" month, used as a proxy for release.
 */
export const CohortPolicySchema = z.object({
  yearCutoff: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("none") }),
    z.object({ kind: z.literal("since_year"), year: z.int().min(1990).max(2100) }),
    /** The newest `years` calendar years present in the snapshot (anchored to its newest record, not the clock). */
    z.object({ kind: z.literal("rolling"), years: z.int().min(1).max(50) }),
  ]),
  /** Records scoring below this are dropped; null keeps all. */
  minScore: z.number().nonnegative().nullable(),
});
export type CohortPolicy = z.infer<typeof CohortPolicySchema>;

/** Measured on PassMark 2026-10: a 5-year window moves an i5-13400 from P85 to P50 among desktop CPUs; a score floor shifts results by at most 5 points on top. */
export const DEFAULT_COHORT_POLICY: CohortPolicy = {
  yearCutoff: { kind: "rolling", years: 5 },
  minScore: null,
};

export interface DatedRecord {
  readonly released: ReleaseDate | null;
}

export interface Cohort<R> {
  includes(record: R): boolean;
  /** First calendar year admitted, or null when there is no year cutoff. */
  readonly sinceYear: number | null;
  readonly minScore: number | null;
}

const newestYear = (records: readonly DatedRecord[]): number | null => {
  let newest: number | null = null;
  for (const { released } of records) {
    if (released !== null && (newest === null || released.year > newest)) newest = released.year;
  }
  return newest;
};

/**
 * Resolves a policy against a snapshot. Undated records are excluded whenever a year cutoff applies,
 * since their age cannot be shown to be within it.
 */
export function createCohort<R extends DatedRecord>(
  records: readonly R[],
  score: (record: R) => number,
  policy: CohortPolicy,
): Cohort<R> {
  const { yearCutoff, minScore } = policy;
  let sinceYear: number | null = null;
  if (yearCutoff.kind === "since_year") sinceYear = yearCutoff.year;
  else if (yearCutoff.kind === "rolling") {
    const newest = newestYear(records);
    sinceYear = newest === null ? null : newest - yearCutoff.years + 1;
  }
  return {
    sinceYear,
    minScore,
    includes(record) {
      if (minScore !== null && score(record) < minScore) return false;
      if (sinceYear === null) return true;
      return record.released !== null && record.released.year >= sinceYear;
    },
  };
}

/** Plain-language cohort qualifier for rating explanations, e.g. " first seen 2022 or later". */
export const describeCohort = (
  cohort: Cohort<unknown>,
  formatScore: (n: number) => string,
): string =>
  [
    cohort.sinceYear === null ? null : `first seen ${cohort.sinceYear} or later`,
    cohort.minScore === null ? null : `scoring at least ${formatScore(cohort.minScore)}`,
  ]
    .filter((part) => part !== null)
    .map((part) => ` ${part}`)
    .join(",");
