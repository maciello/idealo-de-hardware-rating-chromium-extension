import { RATINGS_COPY } from "../../copy";
import { type MatchedRating, PAGE_RANK, SEGMENT } from "../../model";
import { meterSegments, topPercent } from "../percentile";
import { findRating } from "./find-rating";

export interface MeterInfo {
  filled: number;
  context: string;
}

/**
 * Same pick as hw-bench's segment_percentile: the page's device class when known, else the first
 * segment of the CPU's own PassMark record that is not "unknown".
 */
export function segmentNoun({
  record,
  formFactor,
}: Pick<MatchedRating, "record" | "formFactor">): string {
  const nouns = RATINGS_COPY.segmentNoun;
  const fallback = RATINGS_COPY.segmentNounFallback;
  if (formFactor !== "unknown") return nouns[formFactor] ?? fallback;
  const segment = record.segments.find((s) => s !== "unknown");
  return (segment !== undefined && nouns[segment]) || fallback;
}

export const segmentMeter = (rating: MatchedRating): MeterInfo | null => {
  const segment = findRating(rating, SEGMENT);
  const filled = meterSegments(segment?.value);
  return segment && filled !== null
    ? {
        filled,
        context: RATINGS_COPY.meterSegment(topPercent(segment.value), segmentNoun(rating)),
      }
    : null;
};

export const pageMeter = (rating: MatchedRating): MeterInfo | null => {
  const page = findRating(rating, PAGE_RANK);
  const filled = meterSegments(page?.value);
  return page && filled !== null
    ? { filled, context: RATINGS_COPY.meterPage(topPercent(page.value)) }
    : null;
};

/**
 * The chip meter shows standing in the CPU's device class only. A page-relative meter would fill
 * every bar for a mid CPU on a page of weak ones (owner requirement: a mid CPU must not look good).
 */
export const meterOf = (rating: MatchedRating): MeterInfo | null => segmentMeter(rating);
