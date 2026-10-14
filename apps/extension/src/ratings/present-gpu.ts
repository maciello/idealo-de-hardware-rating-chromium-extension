import type { GpuMatchRating, Rating } from "@idealo-hw/hw-bench";
import { formatDecimal, formatInteger } from "../ui/format";
import { GPU_LABELS, GPU_UNRATED_NOTE, memoryText } from "./gpu-copy";
import type { GpuPart } from "./gpu-reading";
import {
  GPU_AT_LEAST,
  GPU_G3D,
  GPU_PER_EURO,
  GPU_PERCENTILE,
  GPU_ROW_LABELS,
  GPU_SEGMENT_NOUN,
  meterSegments,
  topPercent,
} from "./present";

export const VALUE_ORDER = [GPU_G3D, GPU_PERCENTILE, GPU_PER_EURO] as const;

export const find = (gpu: GpuMatchRating, id: string): Rating | undefined =>
  gpu.ratings.find((r) => r.strategyId === id);

/** Short value text of a GPU rating; falls back to the strategy's own display for unknown ids. */
export function gpuValueText(rating: Rating): string {
  switch (rating.strategyId) {
    case GPU_G3D:
      return formatInteger(rating.value);
    case GPU_PERCENTILE:
      return `top ${topPercent(rating.value)}%`;
    case GPU_PER_EURO:
      return `${formatDecimal(rating.value)} /€`;
    default:
      return rating.display;
  }
}

export interface GpuMeter {
  filled: number;
  /** Plural noun of the comparison group: "laptop GPUs". */
  noun: string;
  /** "top 23% of laptop GPUs", hedged with "at least" when the match was ambiguous. */
  context: string;
}

/** Percentile of the G3D Mark within the page's form factor; absent for an unknown form factor. */
export const gpuMeter = (gpu: GpuMatchRating): GpuMeter | null => {
  const percentile = find(gpu, GPU_PERCENTILE);
  const filled = meterSegments(percentile?.value);
  const noun = GPU_SEGMENT_NOUN[gpu.formFactor];
  if (percentile === undefined || filled === null || noun === undefined) return null;
  const place = `top ${topPercent(percentile.value)}% of ${noun}`;
  return { filled, noun, context: gpu.lowerBound ? `${GPU_AT_LEAST} ${place}` : place };
};

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
  memory === null ? "" : `, graphics memory ${memory.text}`;

/** The G3D Mark as headline, else the first available number; null when nothing can be shown. */
export function gpuLineModel(part: GpuPart): GpuLineModel | null {
  const label = GPU_LABELS[part.kind];
  const memory = part.memory === null ? null : memoryText(part.memory);
  const gpu = part.rating;
  if (gpu === null) {
    return {
      label,
      filled: null,
      value: part.name,
      unrated: true,
      context: null,
      title: `${part.name}: ${GPU_UNRATED_NOTE}`,
      memory,
      aria: `${label} ${part.name}, unrated${memoryAria(memory)}`,
    };
  }
  const primary = VALUE_ORDER.map((id) => find(gpu, id)).find((r) => r !== undefined);
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
    aria: `${label} rating ${GPU_ROW_LABELS[primary.strategyId] ?? primary.strategyId} ${value}${
      meter ? `, ${meter.context}` : ""
    }${memoryAria(memory)}`,
  };
}
