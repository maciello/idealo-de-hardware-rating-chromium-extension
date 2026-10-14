import type { CpuBenchmarkRecord, CpuSegment } from "../benchmark/records";
import type { BenchmarkSnapshot } from "../benchmark/snapshot";
import type { FormFactor } from "../identity/form-factor";
import { type CohortPolicy, createCohort, DEFAULT_COHORT_POLICY, describeCohort } from "./cohort";
import { formatInteger } from "./format";
import { percentileRank } from "./percentile";
import type { Rating, RatingStrategy } from "./strategy";

const SEGMENT_PERCENTILE_ID = "segment_percentile";

/** First listed segment other than "unknown" (PassMark lists "Desktop" before "Laptop"). */
const primarySegment = (cpu: CpuBenchmarkRecord): CpuSegment | null =>
  cpu.segments.find((segment) => segment !== "unknown") ?? null;

interface Pool {
  readonly sorted: readonly number[];
  /** Plural noun for the explanation, e.g. "laptop CPUs". */
  readonly noun: string;
}

/**
 * Percentile of a CPU's multi-thread score within a device class, against the snapshot records the cohort policy admits.
 * With a `formFactor` on the input the page decides the class: laptop ranks against laptop and mobile/embedded records
 * (a record listed under both counts once), desktop against desktop records, whatever segment PassMark files the CPU
 * under (its `cat` is unreliable: a Celeron N5095 is "Desktop", a Core Ultra 9 285H "Mobile/Embedded").
 * Without one, the CPU's own first PassMark segment is used.
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
  const laptopClass: number[] = [];
  for (const record of snapshot.records) {
    if (record.socketCount !== 1 || !cohort.includes(record)) continue;
    for (const segment of record.segments) {
      const marks = bySegment.get(segment);
      if (marks === undefined) bySegment.set(segment, [record.cpuMark]);
      else marks.push(record.cpuMark);
    }
    if (record.segments.includes("laptop") || record.segments.includes("mobile_embedded")) {
      laptopClass.push(record.cpuMark);
    }
  }
  const ascending = (marks: number[]): number[] => marks.sort((a, b) => a - b);
  for (const marks of bySegment.values()) ascending(marks);

  const segmentPool = (segment: CpuSegment): Pool | null => {
    const sorted = bySegment.get(segment);
    return sorted === undefined ? null : { sorted, noun: `${segment.replace("_", "/")} CPUs` };
  };
  const laptopPool: Pool = { sorted: ascending(laptopClass), noun: "laptop CPUs" };
  const poolFor = (cpu: CpuBenchmarkRecord, formFactor: FormFactor): Pool | null => {
    if (formFactor === "laptop") return laptopPool;
    if (formFactor === "desktop") return segmentPool("desktop");
    const segment = primarySegment(cpu);
    return segment === null ? null : segmentPool(segment);
  };

  return {
    id: SEGMENT_PERCENTILE_ID,
    label: "Percentile within segment",
    rate({ cpu, formFactor }): Rating | null {
      const pool = poolFor(cpu, formFactor ?? "unknown");
      if (pool === null) return null;
      const value = percentileRank(pool.sorted, cpu.cpuMark);
      if (value === null) return null;
      return {
        strategyId: SEGMENT_PERCENTILE_ID,
        value,
        display: `P${Math.round(value)}`,
        explanation: `CPU Mark ${formatInteger(cpu.cpuMark)} is at the ${formatInteger(value)}th percentile of ${formatInteger(pool.sorted.length)} ${pool.noun}${cohortText} in the imported snapshot.`,
      };
    },
  };
}
