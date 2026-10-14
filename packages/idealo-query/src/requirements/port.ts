import type { ModelFacet } from "../catalog";

/**
 * Port to a benchmark source. Returns the metrics of the model an option label names, or null when
 * the label resolves to no single model. For a label covering variants ("RTX 5060 Ti" = 8 GB and
 * 16 GB) it must return the weakest variant's metrics so a selection never overstates a minimum.
 */
export type ModelScorer = (
  facet: ModelFacet,
  label: string,
) => Readonly<Record<string, number>> | null;
