import type { Rating } from "@idealo-hw/hw-bench";

/** The numbers and inputs a rating list renders, as one stable string. */
export const valuesOf = (ratings: readonly Rating[]): string =>
  ratings.map((r) => `${r.strategyId}=${r.value}:${JSON.stringify(r)}`).join(",");
