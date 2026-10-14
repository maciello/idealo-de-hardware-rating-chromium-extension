import { type CohortPolicy, CohortPolicySchema } from "@idealo-hw/hw-bench";
import { ROLLING_DEFAULT, SINCE_YEAR_DEFAULT } from "../config";

export type CutoffKind = CohortPolicy["yearCutoff"]["kind"];

/** Stored cohort policy re-validated on read; `fallback` when it is unreadable. */
export function readCohortPolicy(stored: unknown, fallback: CohortPolicy): CohortPolicy {
  const parsed = CohortPolicySchema.safeParse(stored);
  return parsed.success ? parsed.data : fallback;
}

/** The policy with another cutoff kind, starting from that kind's default window. */
export function withCutoffKind(policy: CohortPolicy, kind: CutoffKind): CohortPolicy {
  return {
    ...policy,
    yearCutoff:
      kind === "none"
        ? { kind }
        : kind === "since_year"
          ? { kind, year: SINCE_YEAR_DEFAULT }
          : { kind, years: ROLLING_DEFAULT },
  };
}

/** Out-of-range or empty input is not a policy: storage only ever holds valid ones. */
export const isValidCohortPolicy = (next: CohortPolicy): boolean =>
  CohortPolicySchema.safeParse(next).success;
