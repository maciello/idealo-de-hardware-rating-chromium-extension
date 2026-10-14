import type { Cohort } from "./cohort";

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
