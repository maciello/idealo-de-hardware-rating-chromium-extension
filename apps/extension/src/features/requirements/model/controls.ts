import type { FacetOption, NumericFacet } from "@idealo-hw/idealo-query";

/** "min": at least; "max": at most; "range": both ends. */
export type Direction = "min" | "max" | "range";
export type Unit = "GB" | "Hz" | "cd/m²" | "kg" | "h" | "Zoll" | "";

export interface NumericControl {
  readonly facet: NumericFacet;
  readonly unit: Unit;
  readonly direction: Direction;
}

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
