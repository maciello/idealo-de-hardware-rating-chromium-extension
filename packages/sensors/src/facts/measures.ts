import type { Measure, NumericFacet } from "@idealo-hw/idealo-query";
import { mergeFacts } from "./merge";
import type { ProductFacts } from "./model";

const FIRST_RELEASE_YEAR = 1990;
const LAST_RELEASE_YEAR = 2100;

/** What each numeric facet states about the product; facets not listed here are not product facts. */
const FACT_OF: Readonly<Partial<Record<NumericFacet, (value: number) => ProductFacts>>> = {
  ram_gb: (ramGb) => ({ ramGb }),
  ssd_gb: (storageGb) => ({ storageGb, storageKind: "ssd" }),
  storage_gb: (storageGb) => ({ storageGb }),
  brightness_nits: (brightnessNits) => ({ brightnessNits }),
  release_year: (releaseYear) =>
    releaseYear >= FIRST_RELEASE_YEAR && releaseYear <= LAST_RELEASE_YEAR ? { releaseYear } : {},
};

const factOf = ({ facet, value }: Measure): ProductFacts =>
  value > 0 ? (FACT_OF[facet]?.(value) ?? {}) : {};

/** The largest stated value of each fact wins, so a 1 TB drive beside a 128 GB one is 1000 GB. */
export const factsFromMeasures = (measures: readonly Measure[]): ProductFacts =>
  mergeFacts(...[...measures].sort((a, b) => b.value - a.value).map(factOf));

/** An SSD stated through its capacity overrules an HDD named by type: the product has an SSD. */
export const withSsdEvidence = (facts: ProductFacts, measured: ProductFacts): ProductFacts =>
  facts.storageKind === "hdd" && measured.storageKind === "ssd"
    ? { ...facts, storageKind: "ssd" }
    : facts;
