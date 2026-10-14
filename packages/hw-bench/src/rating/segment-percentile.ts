import type { CpuBenchmarkRecord, CpuSegment } from "../benchmark/records";
import type { BenchmarkSnapshot } from "../benchmark/snapshot";
import { formatInteger } from "./format";
import { percentileRank } from "./percentile";
import type { Rating, RatingStrategy } from "./strategy";

const SEGMENT_PERCENTILE_ID = "segment_percentile";

/** First listed segment other than "unknown" (PassMark lists "Desktop" before "Laptop"). */
const primarySegment = (cpu: CpuBenchmarkRecord): CpuSegment | null =>
  cpu.segments.find((segment) => segment !== "unknown") ?? null;

/**
 * Percentile of a CPU's multi-thread score within its segment across the whole snapshot.
 * Sorted score arrays are built once here; each `rate` call is a binary search.
 * Multi-socket results are excluded from the distribution (they would inflate server/desktop pools).
 */
export function segmentPercentile(snapshot: BenchmarkSnapshot<CpuBenchmarkRecord>): RatingStrategy {
  const bySegment = new Map<CpuSegment, number[]>();
  for (const record of snapshot.records) {
    if (record.socketCount !== 1) continue;
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
        explanation: `CPU Mark ${formatInteger(cpu.cpuMark)} is at the ${formatInteger(value)}th percentile of ${formatInteger(sorted.length)} ${segment.replace("_", "/")} CPUs in the imported snapshot.`,
      };
    },
  };
}
