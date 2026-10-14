import type { BenchmarkSnapshot, CpuBenchmarkRecord } from "../../benchmark";
import type { CohortPolicy } from "../cohort";
import type { RatingStrategy } from "../strategy";
import { peerPercentile } from "./peer-percentile";
import { multiThreadScore, singleThreadScore, valuePerEuro } from "./scores";
import { segmentPercentile } from "./segment-percentile";

/** Strategies that need no data beyond their input. The order is the order ratings are listed in. */
export const defaultStrategies: readonly RatingStrategy[] = [
  multiThreadScore,
  singleThreadScore,
  valuePerEuro,
  peerPercentile,
];

/** Defaults plus the strategies that are built from the imported snapshot. */
export const createStrategies = (
  snapshot: BenchmarkSnapshot<CpuBenchmarkRecord>,
  cohortPolicy?: CohortPolicy,
): readonly RatingStrategy[] => [...defaultStrategies, segmentPercentile(snapshot, cohortPolicy)];
