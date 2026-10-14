import { groupKey, type Measure, measureOf } from "@idealo-hw/idealo-query";
import { factsFromMeasures, withSsdEvidence } from "./measures";
import { mergeFacts } from "./merge";
import type { ProductFacts } from "./model";
import { LABEL_TABLE } from "./readers";
import { clean } from "./text";

const settle = (read: readonly ProductFacts[], measures: readonly Measure[]): ProductFacts => {
  const measured = factsFromMeasures(measures);
  return withSsdEvidence(mergeFacts(...read, measured), measured);
};

/**
 * Product-page datasheet, label -> value as hw-bench's parseSpecBlock returns it. Labels that are
 * filter facets resolve through idealo-query's vocabulary, the rest through LABEL_TABLE; anything
 * unreadable states no fact. RAM type is not read here: the caller passes it in.
 */
export function fromDatasheet(specs: ReadonlyMap<string, string>): ProductFacts {
  const rows = [...specs].map(([label, value]) => ({
    label,
    key: groupKey(label),
    value: clean(value),
  }));
  const read = LABEL_TABLE.map((entry) =>
    entry.read(rows.filter((row) => entry.keys.has(row.key)).map((row) => row.value)),
  );
  const measures = rows.flatMap((row) => measureOf(row.label, row.value) ?? []);
  return settle(read, measures);
}

const MAX_TILE_WORDS = 8;

/** "32 GB RAM" is value "32 GB" under group "RAM"; "Markteinführung 2025" puts the group first. */
function measureOfTile(tile: string): Measure | null {
  const words = tile.split(" ").slice(0, MAX_TILE_WORDS);
  for (let cut = 1; cut < words.length; cut++) {
    const asSuffix = measureOf(words.slice(cut).join(" "), words.slice(0, cut).join(" "));
    if (asSuffix !== null) return asSuffix;
    const asPrefix = measureOf(words.slice(0, cut).join(" "), words.slice(cut).join(" "));
    if (asPrefix !== null) return asPrefix;
  }
  return null;
}

const BARE_READERS = LABEL_TABLE.filter((entry) => entry.bare);

/**
 * Bare listing-tile values ("32 GB RAM", "1.000 GB SSD-Speicher", "Full HD", "Windows 11 Home").
 * A tile carries its group name as a suffix, or none at all for names that identify themselves.
 */
export function fromCharacteristics(values: readonly string[]): ProductFacts {
  const tiles = values.map(clean).filter((tile) => tile !== "");
  const read = BARE_READERS.map((entry) => entry.read(tiles));
  const measures = tiles.flatMap((tile) => measureOfTile(tile) ?? []);
  return settle(read, measures);
}
