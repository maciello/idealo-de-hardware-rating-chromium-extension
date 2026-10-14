import { RATINGS_COPY } from "../../copy";
import { type MatchedRating, MULTI, PAGE_RANK, ROW_ORDER, SEGMENT } from "../../model";
import type { CardRow } from "../card-row";
import { findRating } from "./find-rating";
import { pageMeter, segmentMeter, segmentNoun } from "./meter";
import { powerSignalOf } from "./power";
import { valueText } from "./value-text";

/**
 * One row per enabled strategy that produced a rating. The segment percentile describes the
 * multi-thread score, so it rides on that row; without it, it gets a row of its own. The on-page
 * percentile only shows as a meter on the page-rank row when no segment percentile exists.
 */
export function cardRows(rating: MatchedRating): CardRow[] {
  const segment = segmentMeter(rating);
  const rows: CardRow[] = [];
  for (const id of ROW_ORDER) {
    const r = findRating(rating, id);
    if (!r) continue;
    const meter =
      id === MULTI
        ? (segment ?? pageMeter(rating))
        : id === PAGE_RANK && !segment
          ? pageMeter(rating)
          : null;
    rows.push({
      id,
      label: RATINGS_COPY.rowLabels[id] ?? id,
      value: valueText(r, rating.pageRank),
      title: r.explanation,
      meter: meter ? { filled: meter.filled, text: meter.context } : null,
    });
  }
  const segmentRating = findRating(rating, SEGMENT);
  if (segmentRating && !rows.some((row) => row.id === MULTI)) {
    rows.unshift({
      id: SEGMENT,
      label: RATINGS_COPY.rowLabels[SEGMENT] ?? SEGMENT,
      value: valueText(segmentRating, null),
      title: segmentRating.explanation,
      meter: segment
        ? { filled: segment.filled, text: RATINGS_COPY.segmentRowContext(segmentNoun(rating)) }
        : null,
    });
  }
  const power = powerSignalOf(rating);
  if (power) {
    rows.push({
      id: "power",
      label: power.label,
      value: power.detail,
      title: power.evidence.map((e) => `${e.field}: ${e.value}`).join(" · "),
      meter: null,
    });
  }
  return rows;
}
