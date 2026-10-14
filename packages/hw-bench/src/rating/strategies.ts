import { formatDecimal, formatInteger } from "./format";
import { percentileRank } from "./percentile";
import type { Rating, RatingStrategy } from "./strategy";

const MULTITHREADSCORE_ID = "raw_multithread_score";

export const multiThreadScore: RatingStrategy = {
  id: MULTITHREADSCORE_ID,
  label: "Multi-thread score",
  rate({ cpu }): Rating {
    return {
      strategyId: MULTITHREADSCORE_ID,
      value: cpu.cpuMark,
      display: formatInteger(cpu.cpuMark),
      explanation: `PassMark CPU Mark (multi-thread) of ${cpu.name}: ${formatInteger(cpu.cpuMark)}.`,
    };
  },
};

const SINGLETHREADSCORE_ID = "single_thread_score";

export const singleThreadScore: RatingStrategy = {
  id: SINGLETHREADSCORE_ID,
  label: "Single-thread score",
  rate({ cpu }): Rating | null {
    if (cpu.singleThreadMark === null) return null;
    return {
      strategyId: SINGLETHREADSCORE_ID,
      value: cpu.singleThreadMark,
      display: formatInteger(cpu.singleThreadMark),
      explanation: `PassMark single-thread rating of ${cpu.name}: ${formatInteger(cpu.singleThreadMark)}.`,
    };
  },
};

const VALUEPEREURO_ID = "value_per_euro";

export const valuePerEuro: RatingStrategy = {
  id: VALUEPEREURO_ID,
  label: "CPU Mark per euro",
  rate({ cpu, priceEur }): Rating | null {
    if (priceEur === undefined || !Number.isFinite(priceEur) || priceEur <= 0) return null;
    const value = cpu.cpuMark / priceEur;
    return {
      strategyId: VALUEPEREURO_ID,
      value,
      display: `${formatDecimal(value)}/€`,
      explanation: `${formatInteger(cpu.cpuMark)} CPU Mark for ${formatDecimal(priceEur)} EUR = ${formatDecimal(value)} points per euro.`,
    };
  },
};

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
      display: `P${Math.round(value)}`,
      explanation: `CPU Mark ${formatInteger(cpu.cpuMark)} ranks at the ${formatInteger(value)}th percentile of ${marks.length} products in this listing.`,
    };
  },
};
