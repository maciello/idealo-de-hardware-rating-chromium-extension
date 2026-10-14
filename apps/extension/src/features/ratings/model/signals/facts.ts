import {
  type RamType as BenchRamType,
  parseRamLabel,
  parseSpecBlock,
  ramTypeOf,
} from "@idealo-hw/hw-bench";
import {
  fromCharacteristics,
  fromDatasheet,
  mergeFacts,
  type ProductFacts,
} from "@idealo-hw/sensors";
import type { RatingQuery } from "../query";

const ramTypeFact = (found: BenchRamType | null): Pick<ProductFacts, "ramType"> => {
  if (found === null) return {};
  const parsed = parseRamLabel(found.label);
  if (parsed.kind !== "known") return {};
  return {
    ramType: { label: parsed.label, generation: parsed.generation, lowPower: parsed.lowPower },
  };
};

/**
 * What the item states about itself, from the sources that keep their structure: the product page's
 * datasheet before the tile's characteristics. The joined `text` is never split again; the RAM type is
 * the one fact read from it, by hw-bench's grammar.
 */
export const factsOf = (query: RatingQuery): ProductFacts => ({
  ...mergeFacts(
    query.datasheet === undefined ? {} : fromDatasheet(parseSpecBlock(query.datasheet)),
    query.characteristics === undefined ? {} : fromCharacteristics(query.characteristics),
  ),
  ...ramTypeFact(ramTypeOf(query.text)),
});
