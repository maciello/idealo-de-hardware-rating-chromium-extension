import { RATINGS_COPY } from "../copy";
import type { AmbiguousRating, GpuReading, MatchedRating } from "../model";
import { type ChipModel, chipModel } from "./cpu/chip";
import { type GpuLineModel, gpuChipModel } from "./gpu/line";

export interface ChipView {
  /** The CPU rating the chip shows; null when only the GPU line is drawn. */
  cpu: MatchedRating | AmbiguousRating | null;
  /** Null for an ambiguous CPU, which has no numbers. */
  model: ChipModel | null;
  gpuModel: GpuLineModel | null;
  /** Accessible name of the chip button. */
  aria: string;
  /** "matched", "ambiguous", or "gpu" when the chip is the GPU line alone. */
  status: string;
}

/** What the chip draws for a CPU rating and a GPU reading; null when neither has anything to show. */
export function chipViewOf(
  rating: MatchedRating | AmbiguousRating | null,
  gpu: GpuReading | null,
  primaryId: string,
): ChipView | null {
  const model = rating?.status === "matched" ? chipModel(rating, primaryId) : null;
  const gpuModel = gpuChipModel(gpu);
  const cpu = rating !== null && (rating.status === "ambiguous" || model !== null) ? rating : null;
  if (cpu === null && gpuModel === null) return null;
  const aria = RATINGS_COPY.chipAria([
    ...(cpu ? [model?.aria ?? RATINGS_COPY.ambiguousAria] : []),
    ...(gpuModel ? [gpuModel.aria] : []),
  ]);
  return { cpu, model, gpuModel, aria, status: cpu?.status ?? "gpu" };
}
