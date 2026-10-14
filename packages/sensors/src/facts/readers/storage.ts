import type { StorageKind } from "../model";
import { firstMatch, type Reader } from "../text";

/**
 * Festplattentyp values, most specific first: a list naming an SSD next to an HDD reads as "ssd",
 * a plain "Festplatte" (idealo's word for any drive) says nothing.
 */
const KIND_PATTERNS: readonly (readonly [RegExp, StorageKind])[] = [
  [/emmc|\bufs\b|flash[\s-]?speicher/i, "emmc"],
  [/sshd|hybrid/i, "hybrid"],
  [/\bssd\b|nvme|\bm\.2\b/i, "ssd"],
  [/\bhdd\b/i, "hdd"],
];

const kindOf = (value: string): StorageKind | null =>
  KIND_PATTERNS.find(([pattern]) => pattern.test(value))?.[1] ?? null;

/** Festplattentyp: "SSD-Festplatte", "Flash-Speicher", "PCIe-SSD-Festplatte", "HDD-Festplatte". */
export const readStorageKind: Reader = (values) => {
  const kind = firstMatch(values, kindOf);
  return kind === null ? {} : { storageKind: kind };
};
