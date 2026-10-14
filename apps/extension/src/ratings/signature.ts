import type { Rating } from "@idealo-hw/hw-bench";
import type { ItemRating } from "./engine";
import type { GpuPart, GpuReading } from "./gpu-reading";

const valuesOf = (ratings: readonly Rating[]): string =>
  ratings.map((r) => `${r.strategyId}=${r.value}:${r.explanation}`).join(",");

const cpuSignatureOf = (rating: ItemRating): string => {
  if (rating.status === "matched") {
    const rank = rating.pageRank ? `${rating.pageRank.rank}/${rating.pageRank.total}` : "-";
    const signals = rating.signals.map((s) => s.id).join(",");
    return `m:${rating.record.id}:${rating.formFactor}:${rating.ramType?.label ?? "-"}:${valuesOf(rating.ratings)}:${rank}:${signals}`;
  }
  return rating.status === "ambiguous" ? `a:${rating.candidates.map((c) => c.id).join(",")}` : "n";
};

const memorySignatureOf = (part: GpuPart): string =>
  part.memory === null
    ? "-"
    : `${part.memory.source}:${part.memory.megabytes ?? "-"}:${part.memory.type ?? "-"}`;

const partSignatureOf = (part: GpuPart): string => {
  const { rating } = part;
  const rated =
    rating === null
      ? "unrated"
      : `${rating.record.id}:${rating.formFactor}:${rating.lowerBound ? "lb" : "ex"}:${valuesOf(rating.ratings)}`;
  return `${part.kind}:${part.name}:${rated}:${memorySignatureOf(part)}:${part.approximated ? "ap" : "-"}`;
};

const gpuSignatureOf = (gpu: GpuReading | null): string =>
  gpu === null
    ? "-"
    : `g:${partSignatureOf(gpu.primary)}+${gpu.companion === null ? "-" : partSignatureOf(gpu.companion)}`;

/** Everything a chip renders: a changed signature re-renders it, an equal one leaves it alone. */
export const signatureOf = (rating: ItemRating, gpu: GpuReading | null): string =>
  `${cpuSignatureOf(rating)}|${gpuSignatureOf(gpu)}`;
