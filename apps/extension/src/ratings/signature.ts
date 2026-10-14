import type { GpuMatchRating, Rating } from "@idealo-hw/hw-bench";
import type { ItemRating } from "./engine";

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

const gpuSignatureOf = (gpu: GpuMatchRating | null): string =>
  gpu === null
    ? "-"
    : `g:${gpu.record.id}:${gpu.formFactor}:${gpu.lowerBound ? "lb" : "ex"}:${valuesOf(gpu.ratings)}`;

/** Everything a chip renders: a changed signature re-renders it, an equal one leaves it alone. */
export const signatureOf = (rating: ItemRating, gpu: GpuMatchRating | null): string =>
  `${cpuSignatureOf(rating)}|${gpuSignatureOf(gpu)}`;
