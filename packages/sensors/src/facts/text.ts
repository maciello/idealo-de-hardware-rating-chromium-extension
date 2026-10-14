import type { ProductFacts } from "./model";

/** Reads every row whose label is one of an entry's labels and returns the facts they state. */
export type Reader = (values: readonly string[]) => ProductFacts;

/** Datasheet and tile text uses non-breaking spaces; one blank is all the readers see. */
export const clean = (text: string): string => text.replace(/[\s ]+/g, " ").trim();

/** "1.920" -> 1920. */
const germanInt = (text: string): number => Number(text.replace(/\./g, ""));

/** Separators between the items of a ports or outputs list. */
export const listItems = (text: string): string[] =>
  text
    .split(/[,;|/+]/)
    .map(clean)
    .filter((item) => item !== "");

const RESOLUTION = /(\d{1,3}(?:\.\d{3})+|\d+)\s*[x×]\s*(\d{1,3}(?:\.\d{3})+|\d+)/i;

/** The short side of "1.920 x 1.080 Pixel", or null when no pixel grid is stated. */
export function shortSideOf(text: string): number | null {
  const match = RESOLUTION.exec(text);
  if (match === null) return null;
  const side = Math.min(germanInt(match[1] ?? ""), germanInt(match[2] ?? ""));
  return Number.isFinite(side) && side > 0 ? side : null;
}

/** The first value a parser accepts, in row order. */
export function firstMatch<T>(
  values: readonly string[],
  parse: (value: string) => T | null,
): T | null {
  for (const value of values) {
    const parsed = parse(clean(value));
    if (parsed !== null) return parsed;
  }
  return null;
}

/** The largest number a parser finds across the values. */
export function maxMatch(
  values: readonly string[],
  parse: (value: string) => number | null,
): number | null {
  const found = values.flatMap((value) => parse(clean(value)) ?? []);
  return found.length === 0 ? null : Math.max(...found);
}
