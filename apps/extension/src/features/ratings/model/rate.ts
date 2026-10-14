import type { SensorClock, Signal } from "@idealo-hw/sensors";
import type { ItemRating, RatingEngine } from "./cpu";
import type { GpuEngine, GpuReading } from "./gpu";
import type { RatingQuery } from "./query";
import { signalsOf } from "./signals";

/** What one scan rates with: the engines for the imported data and the user's settings. */
export interface RatingView {
  engine: RatingEngine | null;
  gpuEngine: GpuEngine | null;
  primaryId: string;
  importedAt: string | null;
}

/** The three sibling results for one item: what the CPU, the GPU and the product's own facts say. */
export interface QueryRating {
  rating: ItemRating;
  gpu: GpuReading | null;
  signals: readonly Signal[];
}

const NO_MATCH: ItemRating = { status: "no_match" };

/**
 * One entry per query; the GPU engine sees the CPU results, so an abbreviated CPU still names its iGPU.
 * Product signals need no benchmark data, so they are raised even when no engine is loaded.
 */
export function rateQueries(
  view: RatingView,
  queries: readonly RatingQuery[],
  now: SensorClock,
): QueryRating[] {
  const ratings = view.engine?.rate(queries) ?? [];
  const gpus = view.gpuEngine?.rate(queries, ratings) ?? [];
  return queries.map((query, i) => {
    const rating = ratings[i] ?? NO_MATCH;
    return { rating, gpu: gpus[i] ?? null, signals: signalsOf(query, rating, now) };
  });
}
