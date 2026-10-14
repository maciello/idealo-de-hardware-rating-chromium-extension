import { parseSpecBlock } from "@idealo-hw/hw-bench";

export interface RamType {
  /** As idealo writes it: "DDR4", "LPDDR5X". */
  label: string;
  /** DDR4 and older: worth a warning next to a CPU rating. */
  outdated: boolean;
}

/**
 * System memory only: a letter right before "DDR" (GDDR6, a graphics memory) is not RAM, which is
 * what keeps "Grafikspeichertyp GDDR6" out. Tile fragments are exactly this token ("DDR5").
 */
const TOKEN = /(?<![A-Za-z])(LP)?DDR([2-5])(X?)(?![A-Za-z0-9])/gi;

/** Datasheet row labels for the RAM type, compared without case, spaces and hyphens. */
const ROW_LABELS = ["ramtyp", "arbeitsspeichertyp"];

const normalizeLabel = (label: string): string => label.toLowerCase().replace(/[\s-]+/g, "");

const OLDEST_CURRENT_GENERATION = 5;

function typesIn(text: string): RamType[] {
  const found = new Map<string, RamType>();
  for (const [, lowPower = "", generation = "", suffix = ""] of text.matchAll(TOKEN)) {
    const label = `${lowPower}DDR${generation}${suffix}`.toUpperCase();
    found.set(label, { label, outdated: Number(generation) < OLDEST_CURRENT_GENERATION });
  }
  return [...found.values()];
}

/** The one type a text names; several different ones ("DDR4/DDR5 board") say nothing. */
const single = (types: readonly RamType[]): RamType | null =>
  types.length === 1 ? (types[0] ?? null) : null;

/**
 * RAM type of an item from its spec text: the datasheet's RAM-type row when there is one (product
 * pages), else a standalone DDR token among the tile's characteristics. Null when unstated.
 */
export function ramTypeOf(text: string): RamType | null {
  for (const [label, value] of parseSpecBlock(text)) {
    if (ROW_LABELS.includes(normalizeLabel(label))) {
      const row = single(typesIn(value));
      if (row !== null) return row;
    }
  }
  return single(typesIn(text));
}
