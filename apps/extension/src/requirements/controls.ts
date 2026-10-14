import type { FacetOption, NumericFacet } from "@idealo-hw/idealo-query";

/** "min": at least; "max": at most; "range": both ends. */
export type Direction = "min" | "max" | "range";
type Unit = "GB" | "Hz" | "cd/m²" | "kg" | "h" | "Zoll" | "";

export interface NumericControl {
  readonly facet: NumericFacet;
  readonly label: string;
  readonly unit: Unit;
  readonly direction: Direction;
}

/** The numeric requirements offered as sliders, in panel order. */
export const NUMERIC_CONTROLS: readonly NumericControl[] = [
  { facet: "ram_gb", label: "RAM", unit: "GB", direction: "min" },
  { facet: "ssd_gb", label: "SSD", unit: "GB", direction: "min" },
  { facet: "storage_gb", label: "Storage", unit: "GB", direction: "min" },
  { facet: "display_inch", label: "Display size", unit: "Zoll", direction: "range" },
  { facet: "refresh_hz", label: "Refresh rate", unit: "Hz", direction: "min" },
  { facet: "brightness_nits", label: "Brightness", unit: "cd/m²", direction: "min" },
  { facet: "weight_kg", label: "Weight", unit: "kg", direction: "max" },
  { facet: "battery_h", label: "Battery", unit: "h", direction: "min" },
  { facet: "release_year", label: "Release year", unit: "", direction: "min" },
];

const unique = (values: readonly number[]): number[] => [...new Set(values)].sort((a, b) => a - b);

/**
 * The values a slider can snap to, read off the options' parsed intervals: lower ends for "min",
 * finite upper ends for "max", both for "range" (a bucket "14 Zoll" ends where "15 Zoll" starts).
 * Zero (the open end of "bis 2 kg") is no choice.
 */
export function axisOf(options: readonly FacetOption[], direction: Direction): number[] {
  const intervals = options.flatMap((option) =>
    option.interval === null ? [] : [option.interval],
  );
  const lows = intervals.map((interval) => interval.min);
  const highs = intervals.map((interval) => interval.max).filter(Number.isFinite);
  const values = direction === "min" ? lows : direction === "max" ? highs : [...lows, ...highs];
  return unique(values.filter((value) => value > 0));
}

/** Smallest axis value that is at least `value` (the stricter equivalent), else the last one. */
export const snapUp = (axis: readonly number[], value: number): number =>
  axis.find((point) => point >= value) ?? axis[axis.length - 1] ?? value;

/** Largest axis value that is at most `value`, else the first one. */
export const snapDown = (axis: readonly number[], value: number): number =>
  [...axis].reverse().find((point) => point <= value) ?? axis[0] ?? value;

const NUMBER = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

/** "16 GB", "1 TB", "1,4 kg", "2025": value text in the units idealo labels use. */
export function formatMeasure(value: number, unit: Unit): string {
  if (unit === "GB" && value >= 1000) return `${NUMBER.format(value / 1000)} TB`;
  if (unit === "") return String(value);
  return `${NUMBER.format(value)} ${unit}`;
}

/**
 * Slider marks for every axis value, labelled only where labels keep their distance (a fraction of
 * the track), so a dense axis such as 20 SSD sizes stays readable. Both ends are always labelled.
 */
export function labelledMarks(
  axis: readonly number[],
  format: (value: number) => string,
  minGap = 0.16,
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
