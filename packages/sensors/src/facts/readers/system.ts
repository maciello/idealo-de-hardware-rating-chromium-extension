import type { OsKind } from "../model";
import { firstMatch, type Reader } from "../text";

/** Betriebssystem names, anchored at the start so a spec line mentioning Windows in passing is not an OS. */
const OS_PATTERNS: readonly (readonly [RegExp, OsKind])[] = [
  [
    /^(?:free\s*dos|freedos|dos\b|ohne\s+betriebssystem|kein(?:es)?\s+betriebssystem|no\s+os\b)/i,
    "none",
  ],
  [/^(?:microsoft\s+)?windows\b/i, "windows"],
  [/^(?:apple\s+)?mac\s*os\b/i, "macos"],
  [/^chrome\s*os\b/i, "chromeos"],
  [/^(?:linux|ubuntu|debian|fedora)\b/i, "linux"],
];

const osOf = (value: string): OsKind | null =>
  OS_PATTERNS.find(([pattern]) => pattern.test(value))?.[1] ?? null;

/** Betriebssystem: "Windows 11 Home", "Chrome OS", "Free DOS", "ohne Betriebssystem". */
export const readOs: Reader = (values) => {
  const kind = firstMatch(values, osOf);
  return kind === null ? {} : { osKind: kind };
};

const WATT_HOURS = /(\d+(?:[.,]\d+)?)\s*Wh\b/i;

const wattHoursOf = (value: string): number | null => {
  const text = WATT_HOURS.exec(value)?.[1];
  if (text === undefined) return null;
  const wh = Number(text.replace(",", "."));
  return wh > 0 ? wh : null;
};

/** Wattstunden: "60 Wh", "52,5 Wh". */
export const readBattery: Reader = (values) => {
  const wh = firstMatch(values, wattHoursOf);
  return wh === null ? {} : { batteryWh: wh };
};
