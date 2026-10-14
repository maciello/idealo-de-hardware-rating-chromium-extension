/** Year the "Since year" cohort cutoff starts at when it is picked. */
export const SINCE_YEAR_DEFAULT = 2020;

/** Years back the "Last N years" cohort cutoff starts at when it is picked. */
export const ROLLING_DEFAULT = 5;

/** Bounds and number formatting of the cohort inputs. The bounds mirror `CohortPolicySchema`. */
export const COHORT_INPUTS = {
  year: { min: 1990, max: 2100 },
  years: { min: 1, max: 50 },
  minScore: { min: 0, thousandSeparator: ".", decimalSeparator: "," },
} as const;
