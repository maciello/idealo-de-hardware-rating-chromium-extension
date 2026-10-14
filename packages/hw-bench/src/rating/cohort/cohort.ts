import type { ReleaseDate } from "../../benchmark";
import type { CohortPolicy } from "./policy";

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
