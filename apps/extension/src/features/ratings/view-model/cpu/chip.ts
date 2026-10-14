import { RATINGS_COPY } from "../../copy";
import { type MatchedRating, ROW_ORDER } from "../../model";
import { findRating } from "./find-rating";
import { meterOf } from "./meter";
import { type PowerBadge, powerBadgeOf } from "./power";
import { valueText } from "./value-text";

export interface ChipModel {
  filled: number | null;
  value: string;
  label: string;
  /** Memory type to flag next to the rating ("DDR4"); null for current memory or none stated. */
  memoryWarning: string | null;
  /** Power extreme to show as an icon; null for everything in between. */
  power: PowerBadge | null;
  /** Spoken summary of the CPU line; `chipAria` joins it with the other lines. */
  aria: string;
}

/** The chosen primary number, else the first available one; null when nothing can be shown. */
export function chipModel(rating: MatchedRating, primaryId: string): ChipModel | null {
  const order = [primaryId, ...ROW_ORDER];
  const primary = order.map((id) => findRating(rating, id)).find((r) => r !== undefined);
  if (!primary) return null;
  const meter = meterOf(rating);
  const value = valueText(primary, rating.pageRank);
  const memoryWarning = rating.ramType?.outdated ? rating.ramType.label : null;
  const power = powerBadgeOf(rating);
  const tail = [
    ...(meter ? [meter.context] : []),
    ...(memoryWarning
      ? [RATINGS_COPY.oldMemoryAria(memoryWarning, RATINGS_COPY.oldMemoryHint.toLowerCase())]
      : []),
    ...(power ? [power.label.toLowerCase()] : []),
  ];
  return {
    filled: meter?.filled ?? null,
    value,
    label: RATINGS_COPY.cpuLabel,
    memoryWarning,
    power,
    aria: RATINGS_COPY.cpuAria(
      RATINGS_COPY.rowLabels[primary.strategyId] ?? primary.strategyId,
      value,
      tail,
    ),
  };
}
