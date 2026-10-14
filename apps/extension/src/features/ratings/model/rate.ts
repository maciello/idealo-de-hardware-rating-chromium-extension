import type { ItemRating, RatingEngine } from "./cpu";
import type { GpuEngine, GpuReading } from "./gpu";
import type { RatingQuery } from "./query";

/** What one scan rates with: the engines for the imported data and the user's settings. */
export interface RatingView {
  engine: RatingEngine | null;
  gpuEngine: GpuEngine | null;
  primaryId: string;
  importedAt: string | null;
}

export interface QueryRating {
  rating: ItemRating;
  gpu: GpuReading | null;
}

const NO_MATCH: ItemRating = { status: "no_match" };

/** One entry per query; the GPU engine sees the CPU results, so an abbreviated CPU still names its iGPU. */
export function rateQueries(view: RatingView, queries: readonly RatingQuery[]): QueryRating[] {
  const ratings = view.engine?.rate(queries) ?? [];
  const gpus = view.gpuEngine?.rate(queries, ratings) ?? [];
  return queries.map((_, i) => ({ rating: ratings[i] ?? NO_MATCH, gpu: gpus[i] ?? null }));
}
