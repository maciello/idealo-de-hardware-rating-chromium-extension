import { z } from "zod";

const SEPARATORS = /[,$*\s]/g;
const PLAIN_NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)$/;

const isMissing = (text: string): boolean => text === "" || /^n\/?a$/i.test(text);

/**
 * Turns a raw PassMark cell into `null` (missing), a number, or the untouched input
 * (so the downstream zod schema reports it as invalid instead of silently guessing).
 * `unit` is stripped from the end first, e.g. "MHz" for "500 MHz".
 */
export function coerceNumeric(raw: unknown, unit?: string): unknown {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") return raw;
  let text = raw.trim();
  if (unit !== undefined && text.toLowerCase().endsWith(unit.toLowerCase())) {
    text = text.slice(0, text.length - unit.length).trim();
  }
  if (isMissing(text)) return null;
  const stripped = text.replace(SEPARATORS, "");
  return PLAIN_NUMBER.test(stripped) ? Number(stripped) : raw;
}

export const numberOrNull = (unit?: string) =>
  z.preprocess((raw) => coerceNumeric(raw, unit), z.number().nullable());

/** For informational cells PassMark fills with free text ("700-810 MHz", "400?"): unreadable becomes null. */
export const lenientNumberOrNull = (unit?: string) =>
  z.preprocess((raw) => {
    const value = coerceNumeric(raw, unit);
    return typeof value === "number" ? value : null;
  }, z.number().nullable());

export const requiredNumber = (unit?: string) =>
  z.preprocess((raw) => coerceNumeric(raw, unit), z.number());

export const integerOrNull = () =>
  z.preprocess((raw) => coerceNumeric(raw), z.number().int().nullable());

export const requiredInteger = () => z.preprocess((raw) => coerceNumeric(raw), z.number().int());

export const positiveOrNull = (value: number | null): number | null =>
  value !== null && value > 0 ? value : null;

/** Free text cell: trimmed, with "NA"/empty/`unknownSentinel` mapped to null. */
export const textOrNull = (...sentinels: readonly string[]) =>
  z
    .preprocess(
      (raw) => (raw === null || raw === undefined ? null : String(raw)),
      z.string().nullable(),
    )
    .transform((text) => {
      if (text === null) return null;
      const trimmed = text.trim();
      if (isMissing(trimmed) || sentinels.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
        return null;
      }
      return trimmed;
    });

export const requiredText = () =>
  z
    .preprocess((raw) => (raw === null || raw === undefined ? "" : String(raw)), z.string())
    .transform((text) => text.trim())
    .pipe(z.string().min(1, "must not be empty"));
