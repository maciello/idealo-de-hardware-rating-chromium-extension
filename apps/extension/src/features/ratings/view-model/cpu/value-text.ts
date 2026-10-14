import type { Rating } from "@idealo-hw/hw-bench";
import { formatDecimal, formatInteger } from "../../../../ui/format";
import { RATINGS_COPY } from "../../copy";
import { MULTI, PAGE_RANK, type PageRank, PER_EURO, SEGMENT, SINGLE } from "../../model";
import { topPercent } from "../percentile";
import { ratingDisplay } from "../rating-text";

/** Short value text of a rating; falls back to the rating kind's own display for unknown ids. */
export function valueText(rating: Rating, pageRank: PageRank | null): string {
  switch (rating.strategyId) {
    case MULTI:
    case SINGLE:
      return formatInteger(rating.value);
    case PER_EURO:
      return RATINGS_COPY.perEuro(formatDecimal(rating.value));
    case PAGE_RANK:
      return pageRank === null
        ? ratingDisplay(rating)
        : RATINGS_COPY.pageRank(pageRank.rank, pageRank.total);
    case SEGMENT:
      return RATINGS_COPY.topPercent(topPercent(rating.value));
    default:
      return ratingDisplay(rating);
  }
}
