import type { Rating } from "@idealo-hw/hw-bench";
import { formatDecimal, formatInteger } from "../../../../ui/format";
import { RATINGS_COPY } from "../../copy";
import { GPU_G3D, GPU_PER_EURO, GPU_PERCENTILE } from "../../model";
import { topPercent } from "../percentile";
import { ratingDisplay } from "../rating-text";

/** Short value text of a GPU rating; falls back to the rating kind's own display for unknown ids. */
export function gpuValueText(rating: Rating): string {
  switch (rating.strategyId) {
    case GPU_G3D:
      return formatInteger(rating.value);
    case GPU_PERCENTILE:
      return RATINGS_COPY.topPercent(topPercent(rating.value));
    case GPU_PER_EURO:
      return RATINGS_COPY.perEuro(formatDecimal(rating.value));
    default:
      return ratingDisplay(rating);
  }
}
