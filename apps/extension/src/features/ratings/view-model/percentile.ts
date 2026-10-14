import { METER_SEGMENTS } from "../config";

/** Filled segments of the 5-segment meter: ceil(percentile / 20), clamped. Null hides the meter. */
export function meterSegments(percentile: number | null | undefined): number | null {
  if (percentile === null || percentile === undefined || !Number.isFinite(percentile)) return null;
  return Math.min(METER_SEGMENTS, Math.max(0, Math.ceil(percentile / 20)));
}

/** Percentile 77 (better than 77 percent) reads as "top 23%"; never "top 0%". */
export const topPercent = (percentile: number): number =>
  Math.min(100, Math.max(1, Math.round(100 - percentile)));
