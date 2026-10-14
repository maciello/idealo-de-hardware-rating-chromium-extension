import {
  GPU_MEMORY_LABEL,
  GPU_MEMORY_ROW,
  GPU_UNRATED_NOTE,
  IGPU_APPROXIMATED_NOTE,
  IGPU_NOTE,
  memoryText,
} from "./gpu-copy";
import type { GpuPart, GpuReading } from "./gpu-reading";
import {
  type CardRow,
  GPU_MATCH_NOTE,
  GPU_PERCENTILE,
  GPU_ROW_LABELS,
  gpuLowerBoundNote,
} from "./present";
import { find, gpuMeter, gpuValueText, VALUE_ORDER } from "./present-gpu";

/** One row per strategy that produced a rating; the percentile row carries the meter. */
export function gpuCardRows(part: GpuPart, idPrefix = ""): CardRow[] {
  const gpu = part.rating;
  const meter = gpu === null ? null : gpuMeter(gpu);
  const ratingRows = VALUE_ORDER.flatMap((id) => {
    const rating = gpu === null ? undefined : find(gpu, id);
    if (!rating) return [];
    return [
      {
        id: idPrefix + id,
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
  return ratingRows;
}

/** The graphics memory as a card row of its own: a fact about the GPU, not one of the ratings. */
export function gpuMemoryRow(part: GpuPart): CardRow | null {
  if (part.memory === null) return null;
  const memory = memoryText(part.memory);
  return {
    id: GPU_MEMORY_ROW,
    label: GPU_MEMORY_LABEL,
    value: memory.text,
    title: memory.title,
    meter: null,
  };
}

/** Name of the GPU and how sure we are of it. */
export function gpuCardHead(part: GpuPart): { title: string; sub: string } {
  const gpu = part.rating;
  if (gpu === null) return { title: part.name, sub: `Unrated: ${GPU_UNRATED_NOTE}` };
  if (part.kind === "integrated") {
    return { title: gpu.record.name, sub: part.approximated ? IGPU_APPROXIMATED_NOTE : IGPU_NOTE };
  }
  return {
    title: gpu.record.name,
    sub: gpu.lowerBound ? gpuLowerBoundNote(gpu.variants.length) : GPU_MATCH_NOTE,
  };
}

export interface GpuCardSection {
  /** "card-gpu" for the GPU line's GPU, "card-igpu" for the CPU's iGPU shown beside a card. */
  testId: string;
  title: string;
  sub: string;
  /** Rating rows, one per strategy. */
  rows: CardRow[];
  /** The graphics memory; its test id is `${testId}-memory`. */
  memory: CardRow | null;
}

/** The card's GPU sections: the line's GPU first, then the CPU's iGPU when a dedicated card took the line. */
export function gpuCardSections({ primary, companion }: GpuReading): GpuCardSection[] {
  const section = (part: GpuPart, testId: string, idPrefix: string): GpuCardSection => ({
    testId,
    ...gpuCardHead(part),
    rows: gpuCardRows(part, idPrefix),
    memory: gpuMemoryRow(part),
  });
  return [
    section(primary, "card-gpu", ""),
    ...(companion === null ? [] : [section(companion, "card-igpu", "igpu_")]),
  ];
}
