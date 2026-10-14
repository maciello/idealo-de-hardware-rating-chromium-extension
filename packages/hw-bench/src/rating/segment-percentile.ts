import type { CpuBenchmarkRecord, CpuSegment } from "../benchmark/records";
import type { BenchmarkSnapshot } from "../benchmark/snapshot";
import { type CohortPolicy, createCohort, DEFAULT_COHORT_POLICY, describeCohort } from "./cohort";
import { formatInteger } from "./format";
import { percentileRank } from "./percentile";
import type { Rating, RatingStrategy } from "./strategy";

const SEGMENT_PERCENTILE_ID = "segment_percentile";

/** First listed segment other than "unknown" (PassMark lists "Desktop" before "Laptop"). */
const primarySegment = (cpu: CpuBenchmarkRecord): CpuSegment | null =>
  cpu.segments.find((segment) => segment !== "unknown") ?? null;

/**
 * Percentile of a CPU's multi-thread score within its segment, against the snapshot records the cohort policy admits.
 * Sorted score arrays are built once here; each `rate` call is a binary search.
 * Multi-socket results are excluded from the distribution (they would inflate server/desktop pools).
 */
export function segmentPercentile(
  snapshot: BenchmarkSnapshot<CpuBenchmarkRecord>,
  policy: CohortPolicy = DEFAULT_COHORT_POLICY,
): RatingStrategy {
  const cohort = createCohort(snapshot.records, (record) => record.cpuMark, policy);
  const cohortText = describeCohort(cohort, formatInteger);
  const bySegment = new Map<CpuSegment, number[]>();
  for (const record of snapshot.records) {
    if (record.socketCount !== 1 || !cohort.includes(record)) continue;
    for (const segment of record.segments) {
      const marks = bySegment.get(segment);
      if (marks === undefined) bySegment.set(segment, [record.cpuMark]);
      else marks.push(record.cpuMark);
    }
  }
  for (const marks of bySegment.values()) marks.sort((a, b) => a - b);

  return {
    id: SEGMENT_PERCENTILE_ID,
    label: "Percentile within segment",
    rate({ cpu }): Rating | null {
      const segment = primarySegment(cpu);
      if (segment === null) return null;
      const sorted = bySegment.get(segment);
      if (sorted === undefined) return null;
      const value = percentileRank(sorted, cpu.cpuMark);
      if (value === null) return null;
      return {
        strategyId: SEGMENT_PERCENTILE_ID,
        value,
        display: `P${Math.round(value)}`,
        explanation: `CPU Mark ${formatInteger(cpu.cpuMark)} is at the ${formatInteger(value)}th percentile of ${formatInteger(sorted.length)} ${segment.replace("_", "/")} CPUs${cohortText} in the imported snapshot.`,
      };
    },
  };
}
