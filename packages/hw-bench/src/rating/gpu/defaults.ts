import type { BenchmarkSnapshot, GpuBenchmarkRecord } from "../../benchmark";
import type { CohortPolicy } from "../cohort";
import type { GpuRatingStrategy } from "../strategy";
import { gpuPercentile } from "./percentile";
import { g3dScore, gpuValuePerEuro } from "./scores";

/** Strategies that need no data beyond their input. The order is the order ratings are listed in. */
export const gpuDefaultStrategies: readonly GpuRatingStrategy[] = [g3dScore, gpuValuePerEuro];

/** Defaults plus the percentile, which is built from the imported GPU snapshot. */
export const createGpuStrategies = (
  snapshot: BenchmarkSnapshot<GpuBenchmarkRecord>,
  cohortPolicy?: CohortPolicy,
): readonly GpuRatingStrategy[] => [...gpuDefaultStrategies, gpuPercentile(snapshot, cohortPolicy)];
