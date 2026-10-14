import type { GpuMatchRating, Rating } from "@idealo-hw/hw-bench";
import {
  type CardRow,
  formatDecimal,
  formatInteger,
  GPU_AT_LEAST,
  GPU_G3D,
  GPU_LABEL,
  GPU_MATCH_NOTE,
  GPU_PER_EURO,
  GPU_PERCENTILE,
  GPU_ROW_LABELS,
  GPU_SEGMENT_NOUN,
  gpuLowerBoundNote,
  meterSegments,
  topPercent,
} from "./present";

const VALUE_ORDER = [GPU_G3D, GPU_PERCENTILE, GPU_PER_EURO] as const;

const find = (gpu: GpuMatchRating, id: string): Rating | undefined =>
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

interface GpuMeter {
  filled: number;
  /** Plural noun of the comparison group: "laptop GPUs". */
  noun: string;
  /** "top 23% of laptop GPUs", hedged with "at least" when the match was ambiguous. */
  context: string;
}

/** Percentile of the G3D Mark within the page's form factor; absent for an unknown form factor. */
const gpuMeter = (gpu: GpuMatchRating): GpuMeter | null => {
  const percentile = find(gpu, GPU_PERCENTILE);
  const filled = meterSegments(percentile?.value);
  const noun = GPU_SEGMENT_NOUN[gpu.formFactor];
  if (percentile === undefined || filled === null || noun === undefined) return null;
  const place = `top ${topPercent(percentile.value)}% of ${noun}`;
  return { filled, noun, context: gpu.lowerBound ? `${GPU_AT_LEAST} ${place}` : place };
};

export interface GpuLineModel {
  filled: number | null;
  value: string;
  label: string;
  /** "top 23% of laptop GPUs"; null without a percentile. */
  context: string | null;
  /** Spoken summary, part of the chip button's accessible name. */
  aria: string;
}

/** The G3D Mark as headline, else the first available number; null when nothing can be shown. */
export function gpuLineModel(gpu: GpuMatchRating): GpuLineModel | null {
  const primary = VALUE_ORDER.map((id) => find(gpu, id)).find((r) => r !== undefined);
  if (!primary) return null;
  const meter = gpuMeter(gpu);
  const value = gpuValueText(primary);
  return {
    filled: meter?.filled ?? null,
    value,
    label: GPU_LABEL,
    context: meter?.context ?? null,
    aria: `${GPU_LABEL} rating ${GPU_ROW_LABELS[primary.strategyId] ?? primary.strategyId} ${value}${
      meter ? `, ${meter.context}` : ""
    }`,
  };
}

/** One row per strategy that produced a rating; the percentile row carries the meter. */
export function gpuCardRows(gpu: GpuMatchRating): CardRow[] {
  const meter = gpuMeter(gpu);
  return VALUE_ORDER.flatMap((id) => {
    const rating = find(gpu, id);
    if (!rating) return [];
    return [
      {
        id,
        label: GPU_ROW_LABELS[id] ?? id,
        value: gpuValueText(rating),
        title: rating.explanation,
        meter:
          id === GPU_PERCENTILE && meter
            ? { filled: meter.filled, text: `of ${meter.noun}` }
            : null,
      },
    ];
  });
}

/** Name of the matched card and how sure the match is. */
export const gpuCardHead = (gpu: GpuMatchRating): { title: string; sub: string } => ({
  title: gpu.record.name,
  sub: gpu.lowerBound ? gpuLowerBoundNote(gpu.variants.length) : GPU_MATCH_NOTE,
});
