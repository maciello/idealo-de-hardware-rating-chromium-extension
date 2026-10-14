import { z } from "zod";

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
