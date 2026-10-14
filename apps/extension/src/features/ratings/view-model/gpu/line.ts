import { RATINGS_COPY } from "../../copy";
import { GPU_VALUE_ORDER, type GpuPart, type GpuReading } from "../../model";
import { memoryText } from "./memory-text";
import { findGpuRating, gpuMeter } from "./meter";
import { gpuValueText } from "./value-text";

export interface GpuLineModel {
  /** "GPU" for a dedicated card, "iGPU" for the CPU's graphics. */
  label: string;
  filled: number | null;
  /** The G3D Mark; for an unrated GPU its name. */
  value: string;
  /** The GPU is known but PassMark has no rating for it: the value is a name, not a number. */
  unrated: boolean;
  /** "top 23% of laptop GPUs"; null without a percentile. */
  context: string | null;
  /** Tooltip of the line: the comparison group, or what is missing for an unrated GPU. */
  title: string | null;
  memory: { text: string; title: string } | null;
  /** Spoken summary, part of the chip button's accessible name. */
  aria: string;
}

const memoryAria = (memory: GpuLineModel["memory"]): string =>
  memory === null ? "" : RATINGS_COPY.gpuMemoryAria(memory.text);

/** The G3D Mark as headline, else the first available number; null when nothing can be shown. */
export function gpuLineModel(part: GpuPart): GpuLineModel | null {
  const label = RATINGS_COPY.gpuLabels[part.kind];
  const memory = part.memory === null ? null : memoryText(part.memory);
  const gpu = part.rating;
  if (gpu === null) {
    return {
      label,
      filled: null,
      value: part.name,
      unrated: true,
      context: null,
      title: RATINGS_COPY.gpuUnratedTitle(part.name, RATINGS_COPY.gpuUnratedNote),
      memory,
      aria: RATINGS_COPY.gpuUnratedAria(label, part.name, memoryAria(memory)),
    };
  }
  const primary = GPU_VALUE_ORDER.map((id) => findGpuRating(gpu, id)).find((r) => r !== undefined);
  if (!primary) return null;
  const meter = gpuMeter(gpu);
  const value = gpuValueText(primary);
  return {
    label,
    filled: meter?.filled ?? null,
    value,
    unrated: false,
    context: meter?.context ?? null,
    title: meter?.context ?? null,
    memory,
    aria: RATINGS_COPY.gpuRatingAria(
      label,
      RATINGS_COPY.gpuRowLabels[primary.strategyId] ?? primary.strategyId,
      value,
      `${meter ? RATINGS_COPY.gpuMeterAria(meter.context) : ""}${memoryAria(memory)}`,
    ),
  };
}

/** The chip's GPU model for a reading: the line's GPU only; the companion iGPU lives in the card. */
export const gpuChipModel = (gpu: GpuReading | null): GpuLineModel | null =>
  gpu === null ? null : gpuLineModel(gpu.primary);
