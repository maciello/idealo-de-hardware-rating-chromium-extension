import type { RamType } from "../../src/facts";

/**
 * Synthetic datasheets: verbatim idealo label names and value shapes, invented products. A clean,
 * current laptop that trips no red flag; tests override single rows to trip one.
 */
const MODERN_LAPTOP: ReadonlyArray<readonly [string, string]> = [
  ["Displayauflösung", "2.560 x 1.600 Pixel"],
  ["Display-Technologie", "WQXGA"],
  ["RAM", "16 GB"],
  ["RAM Typ", "LPDDR5X"],
  ["Festplattentyp", "PCIe-SSD-Festplatte"],
  ["SSD-Speicher", "512 GB"],
  ["WLAN-Standard", "IEEE 802.11be"],
  ["Helligkeit", "400 cd/m²"],
  ["Wattstunden", "70 Wh"],
  ["Markteinführung", "2025"],
  ["Anschlüsse", "2 x USB 3.2, 1 x Thunderbolt 4, Kopfhörerausgang, Mikrofoneingang"],
  ["Videoausgang", "HDMI 2.1"],
  ["Betriebssystem", "Windows 11 Home"],
  ["Kameraauflösung", "1920 x 1080 Pixel"],
];

/** `null` removes a row, a string replaces or adds it. */
export type Overrides = Readonly<Record<string, string | null>>;

export const datasheet = (overrides: Overrides = {}): Map<string, string> => {
  const rows = new Map(MODERN_LAPTOP);
  for (const [label, value] of Object.entries(overrides)) {
    if (value === null) rows.delete(label);
    else rows.set(label, value);
  }
  return rows;
};

export const LPDDR5X: RamType = { label: "LPDDR5X", generation: 5, lowPower: true };

export const ddr = (generation: number): RamType => ({
  label: `DDR${generation}`,
  generation,
  lowPower: false,
});
