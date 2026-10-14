import { parseSpecBlock, SPEC_LABELS, valuesOfLabels } from "./specs";

/**
 * System memory only: a letter right before "DDR" (GDDR6, a graphics memory) is not RAM, which is
 * what keeps "Grafikspeichertyp GDDR6" out. Tile fragments are exactly this token ("DDR5").
 * Generations DDR2..DDR5, each with an optional low-power prefix and "X" suffix.
 */
const TOKEN_SOURCE = "(?<![A-Za-z])(LP)?DDR([2-5])(X?)(?![A-Za-z0-9])";

/** DDR4 and older are outdated; DDR5 is the baseline. */
const OLDEST_CURRENT_GENERATION = 5;

export interface RamType {
  /** As idealo writes it: "DDR4", "LPDDR5X". */
  label: string;
  /** DDR4 and older: worth a warning next to a CPU rating. */
  outdated: boolean;
}

/** A RAM-type label read into its parts; a label outside the grammar is explicitly unknown. */
export type RamLabel =
  | { kind: "known"; label: string; generation: number; lowPower: boolean; outdated: boolean }
  | { kind: "unknown"; label: string };

/** Reads one label ("DDR5", "lpddr5x", "DDR4-3200 SDRAM"); a known label is normalized to upper case. */
export function parseRamLabel(label: string): RamLabel {
  const match = new RegExp(TOKEN_SOURCE, "i").exec(label);
  if (match === null) return { kind: "unknown", label };
  const [, lowPower = "", generation = "", suffix = ""] = match;
  return {
    kind: "known",
    label: `${lowPower}DDR${generation}${suffix}`.toUpperCase(),
    generation: Number(generation),
    lowPower: lowPower !== "",
    outdated: Number(generation) < OLDEST_CURRENT_GENERATION,
  };
}

const generationOf = (label: string): number => {
  const parsed = parseRamLabel(label);
  return parsed.kind === "known" ? parsed.generation : 0;
};

/** Newest generation first, plain before low-power within one; unknown labels last. */
export const compareRamLabels = (a: string, b: string): number =>
  generationOf(b) - generationOf(a) || a.localeCompare(b);

/** RAM types idealo lists; shown where a category has no RAM-type group of its own. */
export const KNOWN_RAM_TYPES = ["DDR5", "LPDDR5X", "LPDDR5", "DDR4", "LPDDR4X"] as const;

function typesIn(text: string): RamType[] {
  const found = new Map<string, RamType>();
  for (const [token] of text.matchAll(new RegExp(TOKEN_SOURCE, "gi"))) {
    const parsed = parseRamLabel(token);
    if (parsed.kind === "known") {
      found.set(parsed.label, { label: parsed.label, outdated: parsed.outdated });
    }
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
  for (const value of valuesOfLabels(parseSpecBlock(text), SPEC_LABELS.ramType)) {
    const row = single(typesIn(value));
    if (row !== null) return row;
  }
  return single(typesIn(text));
}
