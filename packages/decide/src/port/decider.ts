import type { FilterCatalog, FilterId } from "@idealo-hw/idealo-query";

/** Label of the escape option appended to every choice question. */
export const NONE_OF_THE_ABOVE = "none_of_the_above";

/** A thing the decider may pick; `id` is the caller's identity, `label` is what the model reads. */
export interface DecisionCandidate {
  readonly id: string;
  readonly label: string;
}

export interface ChooseRecordInput {
  /** Facts about the product, e.g. `{ cpu_text: "...", product_title: "..." }`. */
  readonly state: Readonly<Record<string, string>>;
  readonly question: string;
  /** At most 254 (one more slot is taken by `none_of_the_above`). Best-first order is fine; it is shuffled. */
  readonly candidates: readonly DecisionCandidate[];
}

export interface RecordChoice {
  /** A candidate id, or null for none_of_the_above or a confidence below the decider's threshold. */
  readonly chosenId: string | null;
  /** Confidence of the model's top answer (which may be none_of_the_above), 0..1. */
  readonly confidence: number;
  /** Probability per candidate id, plus `none_of_the_above`. */
  readonly probabilities: Readonly<Record<string, number>>;
  readonly model: string;
}

export interface SelectFiltersInput {
  /** Natural-language shopping request. */
  readonly request: string;
  readonly catalog: FilterCatalog;
}

export interface FilterSelection {
  /** Catalog filter ids whose probability reached the threshold, in catalog order. Never contains an unknown id. */
  readonly filterIds: readonly FilterId[];
  /** Every evaluated filter with its yes-probability, in catalog order. */
  readonly perFilter: readonly { readonly filterId: FilterId; readonly probability: number }[];
  readonly model: string;
}

/**
 * Port for bounded judgments (docs/adr/0011): deterministic code proposes candidates, the decider only
 * chooses among them and can never return a name or id that was not offered.
 */
export interface Decider {
  chooseRecord(input: ChooseRecordInput): Promise<RecordChoice>;
  selectFilters(input: SelectFiltersInput): Promise<FilterSelection>;
}

/** Model name reported by `noopDecider`. */
export const NOOP_MODEL = "noop";

/** Offline default: never decides anything. */
export const noopDecider: Decider = {
  chooseRecord: async () => ({
    chosenId: null,
    confidence: 0,
    probabilities: {},
    model: NOOP_MODEL,
  }),
  selectFilters: async () => ({ filterIds: [], perFilter: [], model: NOOP_MODEL }),
};
