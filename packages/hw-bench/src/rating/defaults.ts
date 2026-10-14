import type { CpuBenchmarkRecord } from "../benchmark/records";
import type { BenchmarkSnapshot } from "../benchmark/snapshot";
import { segmentPercentile } from "./segment-percentile";
import { multiThreadScore, peerPercentile, singleThreadScore, valuePerEuro } from "./strategies";
import type { RatingStrategy } from "./strategy";

/** Strategies that need no data beyond their input. */
export const defaultStrategies: readonly RatingStrategy[] = [
  multiThreadScore,
  singleThreadScore,
  valuePerEuro,
  peerPercentile,
];

/** Defaults plus the strategies that are built from the imported snapshot. */
export const createStrategies = (
  snapshot: BenchmarkSnapshot<CpuBenchmarkRecord>,
): readonly RatingStrategy[] => [...defaultStrategies, segmentPercentile(snapshot)];
