import { RATINGS_COPY } from "../../copy";
import { GPU_PERCENTILE, GPU_VALUE_ORDER, type GpuPart, type GpuReading } from "../../model";
import type { CardRow } from "../card-row";
import { lowerBoundNote, ratingExplanation } from "../rating-text";
import { memoryText } from "./memory-text";
import { findGpuRating, gpuMeter } from "./meter";
import { gpuValueText } from "./value-text";

/** One row per strategy that produced a rating; the percentile row carries the meter. */
export function gpuCardRows(part: GpuPart, idPrefix = ""): CardRow[] {
  const gpu = part.rating;
  const meter = gpu === null ? null : gpuMeter(gpu);
  const ratingRows = GPU_VALUE_ORDER.flatMap((id) => {
    const rating = gpu === null ? undefined : findGpuRating(gpu, id);
    if (!rating) return [];
    return [
      {
        id: idPrefix + id,
        label: RATINGS_COPY.gpuRowLabels[id] ?? id,
        value: gpuValueText(rating),
        title: ratingExplanation(rating) + (gpu?.lowerBound ? lowerBoundNote(gpu.variants) : ""),
        meter:
          id === GPU_PERCENTILE && meter
            ? { filled: meter.filled, text: RATINGS_COPY.segmentRowContext(meter.noun) }
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
    id: RATINGS_COPY.gpuMemoryRow,
    label: RATINGS_COPY.gpuMemoryLabel,
    value: memory.text,
    title: memory.title,
    meter: null,
  };
}

/** Name of the GPU and how sure we are of it. */
export function gpuCardHead(part: GpuPart): { title: string; sub: string } {
  const gpu = part.rating;
  if (gpu === null) {
    return { title: part.name, sub: RATINGS_COPY.gpuUnrated(RATINGS_COPY.gpuUnratedNote) };
  }
  if (part.kind === "integrated") {
    return {
      title: gpu.record.name,
      sub: part.approximated ? RATINGS_COPY.igpuApproximatedNote : RATINGS_COPY.igpuNote,
    };
  }
  return {
    title: gpu.record.name,
    sub: gpu.lowerBound
      ? RATINGS_COPY.gpuLowerBoundNote(gpu.variants.length)
      : RATINGS_COPY.gpuMatchNote,
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
