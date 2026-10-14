import { percentileRank } from "../percentile";
import type { Rating, RatingStrategy } from "../strategy";

const MIN_PEERS = 2;

const PEERPERCENTILE_ID = "peer_percentile_on_listing";

export const peerPercentile: RatingStrategy = {
  id: PEERPERCENTILE_ID,
  label: "Percentile among listed products",
  rate({ cpu, peers }): Rating | null {
    const marks = (peers ?? []).map((p) => p.cpuMark).filter(Number.isFinite);
    if (marks.length < MIN_PEERS) return null;
    marks.sort((a, b) => a - b);
    const value = percentileRank(marks, cpu.cpuMark);
    if (value === null) return null;
    return {
      kind: "percentile",
      strategyId: PEERPERCENTILE_ID,
      value,
      metric: "cpu_mark",
      score: cpu.cpuMark,
      sampleSize: marks.length,
      group: "listing",
      cohort: null,
    };
  },
};
