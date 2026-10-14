import { sha256Hex, stableStringify } from "./hash";

/** Port: durable key-value store for decisions, so reruns are idempotent and free. Values are JSON. */
export interface DecisionCache {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

/** In-memory adapter; the extension supplies one backed by extension storage. */
export function createMemoryDecisionCache(): DecisionCache & { readonly size: number } {
  const entries = new Map<string, unknown>();
  return {
    get size() {
      return entries.size;
    },
    get: async (key) => entries.get(key),
    set: async (key, value) => {
      entries.set(key, value);
    },
  };
}

export interface DecisionKeyInput {
  readonly model: string;
  readonly state: unknown;
  readonly question: string;
  /** Order-insensitive: sorted before hashing. */
  readonly candidateIds: readonly string[];
}

/** Stable hash of everything that determines a decision: model, state, question and the candidate set. */
export function decisionKey(input: DecisionKeyInput): Promise<string> {
  return sha256Hex(
    stableStringify({
      model: input.model,
      state: input.state,
      question: input.question,
      candidateIds: [...input.candidateIds].sort(),
    }),
  );
}
