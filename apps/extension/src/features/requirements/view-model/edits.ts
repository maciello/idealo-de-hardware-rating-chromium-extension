import type { Bound, Combine, Metric, NumericFacet, PriceRange } from "@idealo-hw/idealo-query";

/** What the controls can do to the requirements; each call reports the whole next value. */
export interface RequirementEdits {
  setCpuMinimum(metric: Metric, value: number | undefined): void;
  setCpuCombine(combine: Combine): void;
  setGpuMinimum(value: number | undefined): void;
  setNumeric(facet: NumericFacet, bound: Bound): void;
  setRamTypes(labels: string[]): void;
  setPrice(price: PriceRange): void;
}
