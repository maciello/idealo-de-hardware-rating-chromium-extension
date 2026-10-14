import type { ModelScorer, Requirements } from "@idealo-hw/idealo-query";

/** What the requirement controls need besides the catalog; read each time the panel opens. */
export interface RequirementsContext {
  scorer: ModelScorer;
  /** Which PassMark exports are imported. */
  hasData: { cpu: boolean; gpu: boolean };
  /** Cheapest and dearest price of the page's result set; null when the page has no payload. */
  priceBounds: { min: number; max: number } | null;
}

/** Where the last requirements of each category are kept. */
export interface RequirementsStore {
  load(categoryId: string): Promise<Requirements>;
  save(categoryId: string, requirements: Requirements): Promise<void>;
}

export const NO_CONTEXT: RequirementsContext = {
  scorer: () => null,
  hasData: { cpu: false, gpu: false },
  priceBounds: null,
};
