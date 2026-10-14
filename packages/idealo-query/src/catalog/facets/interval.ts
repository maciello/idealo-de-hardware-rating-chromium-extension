/** Inclusive `min`; `max` is Infinity for "ab ..." labels and exclusive when `maxExclusive`. */
export interface Interval {
  readonly min: number;
  readonly max: number;
  readonly maxExclusive: boolean;
}

/** Every value in the interval is >= bound. */
export const allAtLeast = (interval: Interval, bound: number): boolean => interval.min >= bound;

/** Every value in the interval is <= bound. */
export const allAtMost = (interval: Interval, bound: number): boolean => interval.max <= bound;
