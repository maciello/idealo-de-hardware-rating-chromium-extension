import type { Signal } from "@idealo-hw/sensors";
import { RATINGS_COPY } from "../copy";
import type { AmbiguousRating, GpuReading, MatchedRating } from "../model";
import { type ChipModel, chipModel } from "./cpu/chip";
import { type GpuLineModel, gpuChipModel } from "./gpu/line";
import { type SignalsChipModel, signalsChipModel } from "./signals";

export interface ChipView {
  /** The CPU rating the chip shows; null when no CPU line is drawn. */
  cpu: MatchedRating | AmbiguousRating | null;
  /** Null for an ambiguous CPU, which has no numbers. */
  model: ChipModel | null;
  gpuModel: GpuLineModel | null;
  /** The older-memory tag and the flags indicator; null when the product has no red or amber flag. */
  signals: SignalsChipModel | null;
  /** Accessible name of the chip button. */
  aria: string;
  /** "matched", "ambiguous", "gpu" when the chip is the GPU line alone, "signals" when it only carries flags. */
  status: string;
}

const statusOf = (cpu: ChipView["cpu"], gpuModel: GpuLineModel | null): string => {
  if (cpu !== null) return cpu.status;
  return gpuModel === null ? "signals" : "gpu";
};

/**
 * What the chip draws for a CPU rating, a GPU reading and the product's signals; null when none of
 * them has anything to show.
 */
export function chipViewOf(
  rating: MatchedRating | AmbiguousRating | null,
  gpu: GpuReading | null,
  primaryId: string,
  signals: readonly Signal[],
): ChipView | null {
  const model = rating?.status === "matched" ? chipModel(rating, primaryId, signals) : null;
  const gpuModel = gpuChipModel(gpu);
  const signalsModel = signalsChipModel(signals);
  const cpu = rating !== null && (rating.status === "ambiguous" || model !== null) ? rating : null;
  if (cpu === null && gpuModel === null && signalsModel === null) return null;
  const aria = RATINGS_COPY.chipAria([
    ...(cpu ? [model?.aria ?? RATINGS_COPY.ambiguousAria] : []),
    ...(gpuModel ? [gpuModel.aria] : []),
    ...(signalsModel?.aria ?? []),
  ]);
  return { cpu, model, gpuModel, signals: signalsModel, aria, status: statusOf(cpu, gpuModel) };
}
