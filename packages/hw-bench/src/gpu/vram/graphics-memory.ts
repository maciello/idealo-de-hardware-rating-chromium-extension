import { cleanText } from "../../identity";
import { memoryAfter } from "../identity";

/** What idealo's text says about the graphics memory of a product. */
export interface GraphicsMemory {
  /** "Grafikspeicher Shared Memory": the graphics share system RAM, there is no VRAM size. */
  readonly shared: boolean;
  /** VRAM in GB ("Grafikspeicher 16 GB", "16384 MB / 16 GB"); null when shared or not stated. */
  readonly gigabytes: number | null;
  /** "GDDR7", "LPDDR5X", "HBM2" from the "Grafikspeichertyp" row; null when not stated. */
  readonly type: string | null;
}

/** Row labels, compared in `cleanText` form. The longer label first: "grafikspeichertyp" starts with "grafikspeicher". */
const TYPE_LABEL = "grafikspeichertyp";
const SIZE_LABEL = "grafikspeicher";

const KNOWN_TYPE = /^((?:lp|g)?ddr\d+x?|hbm\d*e?)(?![a-z0-9])/;
const SHARED = /^shared(?![a-z])/;

/** The value behind `label` when the line starts with it, as tile fragments ("Grafikspeicher 8 GB") and datasheet rows do. */
function valueAfter(line: string, label: string): string | null {
  if (!line.startsWith(label)) return null;
  const rest = line.slice(label.length);
  return /^[\s:]/.test(rest) ? rest.replace(/^[\s:]+/, "") : null;
}

/**
 * Reads the graphics memory out of tile fragments or datasheet text: the "Grafikspeicher" size or the word
 * "Shared Memory", and the "Grafikspeichertyp" type. The first of each wins. Sizes go through `memoryAfter`, the
 * parser that reads the size behind a GPU model, so "8 GB", "8GB" and "16384 MB / 16 GB" read the same everywhere.
 * Null when the text says nothing about graphics memory.
 */
export function graphicsMemoryOf(sources: readonly string[]): GraphicsMemory | null {
  let size: { shared: boolean; gigabytes: number | null } | null = null;
  let type: string | null = null;
  for (const source of sources) {
    for (const raw of source.split(/\r?\n/)) {
      const line = cleanText(raw);
      const typeValue = valueAfter(line, TYPE_LABEL);
      if (typeValue !== null) {
        type ??= KNOWN_TYPE.exec(typeValue)?.[1]?.toUpperCase() ?? null;
        continue;
      }
      const sizeValue = valueAfter(line, SIZE_LABEL);
      if (sizeValue === null || size !== null) continue;
      if (SHARED.test(sizeValue)) size = { shared: true, gigabytes: null };
      else {
        const { memoryGb } = memoryAfter(sizeValue, 0);
        if (memoryGb !== null) size = { shared: false, gigabytes: memoryGb };
      }
    }
  }
  if (size === null && type === null) return null;
  return { shared: size?.shared ?? false, gigabytes: size?.gigabytes ?? null, type };
}
