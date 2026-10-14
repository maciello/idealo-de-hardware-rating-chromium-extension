import { formatInteger } from "../format";
import { percentileDisplay, percentileRank } from "../percentile";
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
      strategyId: PEERPERCENTILE_ID,
      value,
      display: percentileDisplay(value),
      explanation: `CPU Mark ${formatInteger(cpu.cpuMark)} ranks at the ${formatInteger(value)}th percentile of ${marks.length} products in this listing.`,
    };
  },
};
