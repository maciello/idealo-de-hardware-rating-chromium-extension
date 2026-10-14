import type { GpuMatchRating, Rating } from "@idealo-hw/hw-bench";
import { RATINGS_COPY } from "../../copy";
import { GPU_PERCENTILE } from "../../model";
import { meterSegments, topPercent } from "../percentile";

export const findGpuRating = (gpu: GpuMatchRating, id: string): Rating | undefined =>
  gpu.ratings.find((r) => r.strategyId === id);

export interface GpuMeter {
  filled: number;
  /** Plural noun of the comparison group: "laptop GPUs". */
  noun: string;
  /** "top 23% of laptop GPUs", hedged with "at least" when the match was ambiguous. */
  context: string;
}

/** Percentile of the G3D Mark within the page's form factor; absent for an unknown form factor. */
export const gpuMeter = (gpu: GpuMatchRating): GpuMeter | null => {
  const percentile = findGpuRating(gpu, GPU_PERCENTILE);
  const filled = meterSegments(percentile?.value);
  const noun = RATINGS_COPY.gpuSegmentNoun[gpu.formFactor];
  if (percentile === undefined || filled === null || noun === undefined) return null;
  const place = RATINGS_COPY.meterSegment(topPercent(percentile.value), noun);
  return { filled, noun, context: gpu.lowerBound ? `${RATINGS_COPY.gpuAtLeast} ${place}` : place };
};
