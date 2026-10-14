import { formatTrimmed } from "../../../../ui/format";
import { GB_PER_TB, MARK_LABEL_GAP } from "../../config";
import { REQUIREMENTS_COPY } from "../../copy";
import type { Unit } from "../../model";

/** "16 GB", "1 TB", "1,4 kg", "2025": value text in the units idealo labels use. */
export function formatMeasure(value: number, unit: Unit): string {
  if (unit === "gigabyte" && value >= GB_PER_TB) {
    return `${formatTrimmed(value / GB_PER_TB)} ${REQUIREMENTS_COPY.terabyte}`;
  }
  if (unit === "plain") return String(value);
  return `${formatTrimmed(value)} ${REQUIREMENTS_COPY.units[unit]}`;
}

/**
 * Slider marks for every axis value, labelled only where labels keep their distance (a fraction of
 * the track), so a dense axis such as 20 SSD sizes stays readable. Both ends are always labelled.
 */
export function labelledMarks(
  axis: readonly number[],
  format: (value: number) => string,
  minGap = MARK_LABEL_GAP,
): { value: number; label?: string }[] {
  const first = axis[0] ?? 0;
  const span = (axis[axis.length - 1] ?? first) - first || 1;
  const position = (value: number): number => (value - first) / span;
  const labelled = new Set<number>([0, axis.length - 1]);
  let previous = 0;
  axis.forEach((value, i) => {
    const at = position(value);
    if (i === 0 || i === axis.length - 1 || at - previous < minGap || 1 - at < minGap) return;
    labelled.add(i);
    previous = at;
  });
  return axis.map((value, i) => (labelled.has(i) ? { value, label: format(value) } : { value }));
}
