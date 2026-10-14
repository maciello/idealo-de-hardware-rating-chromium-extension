import type { ReactNode } from "react";
import type { Target } from "../adapters";
import type { AmbiguousRating, GpuReading, ItemRating, MatchedRating } from "../model";

/** A page element with the CPU rating and GPU reading found for it. */
export interface TileRating {
  target: Target;
  rating: ItemRating;
  gpu: GpuReading | null;
}

/** What one chip shows; the composition root turns it into a React element. */
export interface ChipInput {
  /** Null when only the GPU was recognised. */
  rating: MatchedRating | AmbiguousRating | null;
  gpu: GpuReading | null;
  primaryId: string;
  importedAt: string | null;
}

export type ChipRenderer = (input: ChipInput) => ReactNode;
