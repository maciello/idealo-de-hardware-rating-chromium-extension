import type { Signal } from "@idealo-hw/sensors";
import type { AmbiguousRating, ItemRating, MatchedRating } from "./cpu";
import type { GpuReading } from "./gpu";
import { warningsOf } from "./signals";

/** A CPU line is worth showing when it is ambiguous, or matched with at least one number. */
export const isVisible = (rating: ItemRating): boolean =>
  rating.status === "ambiguous" || (rating.status === "matched" && rating.ratings.length > 0);

/** The CPU rating a chip can show: matched with at least one number, or ambiguous. */
export const visibleCpu = (rating: ItemRating): MatchedRating | AmbiguousRating | null =>
  rating.status !== "no_match" && isVisible(rating) ? rating : null;

/** Counts toward the page stats: a matched CPU with a number, or any GPU line. */
export const isRated = ({ rating, gpu }: { rating: ItemRating; gpu: GpuReading | null }): boolean =>
  (rating.status === "matched" && isVisible(rating)) || gpu !== null;

/** Something to draw on the tile at all: a CPU line, a GPU line, or a red or amber flag. */
export const hasChip = ({
  rating,
  gpu,
  signals,
}: {
  rating: ItemRating;
  gpu: GpuReading | null;
  signals: readonly Signal[];
}): boolean => isVisible(rating) || gpu !== null || warningsOf(signals).length > 0;
