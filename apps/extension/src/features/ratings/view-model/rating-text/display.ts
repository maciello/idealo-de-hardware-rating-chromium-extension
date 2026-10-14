import type { Rating } from "@idealo-hw/hw-bench";
import { formatDecimal, formatInteger } from "../../../../ui/format";
import { RATING_TEXT as T } from "../../copy";

/** Short text of a rating by its kind: the shown value of a strategy the chip has no wording for. */
export function ratingDisplay(rating: Rating): string {
  switch (rating.kind) {
    case "score":
      return formatInteger(rating.value);
    case "per_euro":
      return T.display.perEuro(formatDecimal(rating.value));
    case "percentile":
      return T.display.percentile(Math.round(rating.value));
  }
}
