import type { PriceRange } from "@idealo-hw/idealo-query";

/** What a price input holds: the typed number, or "" while empty. */
export type PriceInput = string | number;

/** The bound a price input stands for; undefined while it is empty or not a number. */
export const parseBound = (raw: PriceInput): number | undefined =>
  raw === "" || Number.isNaN(Number(raw)) ? undefined : Number(raw);

/** True when both ends are set and the minimum is above the maximum. */
export const isInverted = (min: PriceInput, max: PriceInput): boolean => {
  const lo = parseBound(min);
  const hi = parseBound(max);
  return lo !== undefined && hi !== undefined && lo > hi;
};

/** The price range the two inputs stand for; null while it is inverted and cannot be applied. */
export function priceRangeOf(min: PriceInput, max: PriceInput): PriceRange | null {
  if (isInverted(min, max)) return null;
  const lo = parseBound(min);
  const hi = parseBound(max);
  return { ...(lo === undefined ? {} : { min: lo }), ...(hi === undefined ? {} : { max: hi }) };
}
