import type { BenchmarkSnapshot, CpuBenchmarkRecord } from "../benchmark";
import type { FormFactor } from "../identity";
import { type CohortPolicy, createCohort, DEFAULT_COHORT_POLICY, describeCohort } from "./cohort";
import { classifyCpu } from "./device-class";
import { formatInteger } from "./format";
import { cohortPercentileRating } from "./percentile";
import type { Rating, RatingStrategy } from "./strategy";

const SEGMENT_PERCENTILE_ID = "segment_percentile";

interface Pool {
  readonly sorted: readonly number[];
  /** Plural noun for the explanation, e.g. "laptop CPUs". */
  readonly noun: string;
}

/**
 * Percentile of a CPU's multi-thread score within a device class, against the snapshot records the cohort policy admits.
 * The classes are the overlapping sets of `device-class.ts` (LaptopCpu, DesktopCpu), defined by chip identity and not by
 * PassMark's unreliable `cat`: phone, embedded, server and virtual chips are in neither. With a `formFactor` on the input
 * the page decides the class: laptop ranks against LaptopCpu, desktop against DesktopCpu, whatever the rated CPU is.
 * Without one, the CPU's own class is used when it belongs to exactly one set (a Snapdragon X is laptop-only, a Core
 * i5-13400 desktop-only); a chip in both (Ryzen 7 7840HS, Apple M4) or neither has no class of its own and gets no rating.
 * Sorted score arrays are built once here; each `rate` call is a binary search.
 * Multi-socket results are excluded from the distribution (they would inflate server/desktop pools).
 */
export function segmentPercentile(
  snapshot: BenchmarkSnapshot<CpuBenchmarkRecord>,
  policy: CohortPolicy = DEFAULT_COHORT_POLICY,
): RatingStrategy {
  const cohort = createCohort(snapshot.records, (record) => record.cpuMark, policy);
  const cohortText = describeCohort(cohort, formatInteger);
  const laptopMarks: number[] = [];
  const desktopMarks: number[] = [];
  for (const record of snapshot.records) {
    if (record.socketCount !== 1 || !cohort.includes(record)) continue;
    const membership = classifyCpu(record.name);
    if (membership.laptop) laptopMarks.push(record.cpuMark);
    if (membership.desktop) desktopMarks.push(record.cpuMark);
  }
  const ascending = (marks: number[]): number[] => marks.sort((a, b) => a - b);
  const laptopPool: Pool = { sorted: ascending(laptopMarks), noun: "laptop CPUs" };
  const desktopPool: Pool = { sorted: ascending(desktopMarks), noun: "desktop CPUs" };
  const poolFor = (cpu: CpuBenchmarkRecord, formFactor: FormFactor): Pool | null => {
    if (formFactor === "laptop") return laptopPool;
    if (formFactor === "desktop") return desktopPool;
    const own = classifyCpu(cpu.name);
    if (own.laptop === own.desktop) return null;
    return own.laptop ? laptopPool : desktopPool;
  };

  return {
    id: SEGMENT_PERCENTILE_ID,
    label: "Percentile within segment",
    rate({ cpu, formFactor }): Rating | null {
      const pool = poolFor(cpu, formFactor ?? "unknown");
      if (pool === null) return null;
      return cohortPercentileRating({
        strategyId: SEGMENT_PERCENTILE_ID,
        metric: "CPU Mark",
        score: cpu.cpuMark,
        sorted: pool.sorted,
        noun: pool.noun,
        cohortText,
      });
    },
  };
}
