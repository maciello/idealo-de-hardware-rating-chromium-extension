import type { NumericSpec } from "./model";

const CORE_WORDS: Readonly<Record<string, number>> = {
  "single-core": 1,
  "dual-core": 2,
  "quad-core": 4,
  "hexa-core": 6,
  "octa-core": 8,
};

/** "1.000" -> 1000, "2,5" -> 2.5. */
const germanNumber = (text: string): number => Number(text.replace(/\./g, "").replace(",", "."));

const NUMBER = String.raw`\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)?`;
const LABEL = new RegExp(
  String.raw`^(?:(bis|unter|ab)\s+)?(${NUMBER})(?:\s+bis\s+(${NUMBER}))?\s*(\S*)$`,
  "i",
);

interface ParsedLabel {
  readonly min: number;
  readonly max: number;
  readonly maxExclusive: boolean;
  readonly point: boolean;
}

export function parseLabel(label: string, spec: NumericSpec): ParsedLabel | null {
  const text = label.trim();
  const word = CORE_WORDS[text.toLowerCase()];
  if (word !== undefined && spec.units["-Core"] !== undefined)
    return { min: word, max: word, maxExclusive: false, point: true };
  const match = LABEL.exec(text);
  if (match === null) return null;
  const [, qualifier, first = "", second, unit = ""] = match;
  const factor = Object.entries(spec.units).find(
    ([u]) => u.toLowerCase() === unit.toLowerCase(),
  )?.[1];
  if (factor === undefined) return null;
  const a = germanNumber(first) * factor;
  if (second !== undefined) {
    if (qualifier !== undefined) return null;
    return { min: a, max: germanNumber(second) * factor, maxExclusive: false, point: false };
  }
  switch (qualifier?.toLowerCase()) {
    case "bis":
      return { min: 0, max: a, maxExclusive: false, point: false };
    case "unter":
      return { min: 0, max: a, maxExclusive: true, point: false };
    case "ab":
      return { min: a, max: Number.POSITIVE_INFINITY, maxExclusive: false, point: false };
    default:
      return { min: a, max: a, maxExclusive: false, point: true };
  }
}
