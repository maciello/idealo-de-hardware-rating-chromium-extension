import { formatDecimal, formatInteger } from "./format";
import { percentileDisplay, percentileRank } from "./percentile";
import type { Rating, RatingInput, RatingStrategy } from "./strategy";

export interface ScoreStrategySpec<I> {
  readonly id: string;
  readonly label: string;
  /** Names the score in the explanation: "PassMark <what> of <subject>: <score>.". */
  readonly what: string;
  readonly subject: (input: I) => string;
  readonly score: (input: I) => number;
}

/** The raw benchmark value as a rating; one definition for every metric (CPU Mark, G3D Mark). */
export const scoreStrategy = <I>(spec: ScoreStrategySpec<I>): RatingStrategy<I> => ({
  id: spec.id,
  label: spec.label,
  rate(input): Rating {
    const value = spec.score(input);
    return {
      strategyId: spec.id,
      value,
      display: formatInteger(value),
      explanation: `PassMark ${spec.what} of ${spec.subject(input)}: ${formatInteger(value)}.`,
    };
  },
});

const MULTITHREADSCORE_ID = "raw_multithread_score";

export const multiThreadScore: RatingStrategy = scoreStrategy<RatingInput>({
  id: MULTITHREADSCORE_ID,
  label: "Multi-thread score",
  what: "CPU Mark (multi-thread)",
  subject: ({ cpu }) => cpu.name,
  score: ({ cpu }) => cpu.cpuMark,
});

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

export interface ValuePerEuroSpec<I> {
  readonly id: string;
  /** Name of the score, e.g. "CPU Mark"; the strategy's label is "<metric> per euro". */
  readonly metric: string;
  readonly score: (input: I) => number;
}

/** Benchmark points per euro of the listing price; null without a usable price. One definition for every metric. */
export const valuePerEuroStrategy = <I extends { readonly priceEur?: number }>(
  spec: ValuePerEuroSpec<I>,
): RatingStrategy<I> => ({
  id: spec.id,
  label: `${spec.metric} per euro`,
  rate(input): Rating | null {
    const { priceEur } = input;
    if (priceEur === undefined || !Number.isFinite(priceEur) || priceEur <= 0) return null;
    const score = spec.score(input);
    const value = score / priceEur;
    return {
      strategyId: spec.id,
      value,
      display: `${formatDecimal(value)}/€`,
      explanation: `${formatInteger(score)} ${spec.metric} for ${formatDecimal(priceEur)} EUR = ${formatDecimal(value)} points per euro.`,
    };
  },
});

const VALUEPEREURO_ID = "value_per_euro";

export const valuePerEuro: RatingStrategy = valuePerEuroStrategy<RatingInput>({
  id: VALUEPEREURO_ID,
  metric: "CPU Mark",
  score: ({ cpu }) => cpu.cpuMark,
});

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
