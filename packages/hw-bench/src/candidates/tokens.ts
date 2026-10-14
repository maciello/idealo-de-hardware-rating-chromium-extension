import { cleanText } from "../identity";

/** "3.40 GHz" style clock speeds, with or without the PassMark "@" prefix. */
const CLOCK = /(?:@\s*)?\d+(?:[.,]\d+)?\s*ghz\b/g;

/** Units glued to a number ("16gb", "3200mhz") and memory generations ("gddr6", "ddr5"): never a model number. */
const NOT_A_MODEL = /^(?:\d+(?:gb|tb|mb|ghz|mhz|hz|w|wh|mah|zoll|inch|nm)|g?ddr\d.*|lpddr\d.*)$/;

/**
 * Splits a product or PassMark name into lowercase search tokens.
 * Separators are everything except letters, digits and "+", so "i7-13700H" -> ["i7", "13700h"] while
 * "Max+" and "275HX" stay whole. Clock speeds ("@ 3.40GHz") are dropped; trademark marks vanish in `cleanText`.
 */
export function tokenize(text: string): string[] {
  const cleaned = cleanText(text).replace(CLOCK, " ");
  return cleaned.split(/[^a-z0-9+]+/).filter((token) => token !== "" && /[a-z0-9]/.test(token));
}

/** A token that looks like a model number: has a digit, at least 3 characters, and is not a unit or memory spec. */
export function isModelNumberLike(token: string): boolean {
  return token.length >= 3 && /\d/.test(token) && !NOT_A_MODEL.test(token);
}
