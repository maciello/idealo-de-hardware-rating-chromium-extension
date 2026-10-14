import type { Decider } from "../port";
import { chooseRecord } from "./choose-record";
import { defaultClient } from "./client";
import { DEFAULT_JEV_MODEL, DEFAULT_MAX_REQUEST_TOKENS, DEFAULT_THRESHOLD } from "./config";
import type { JevDeciderOptions, JevRuntime } from "./options";
import { selectFilters } from "./select-filters";

/**
 * Decider backed by TypeSafe Jev through OpenRouter (`POST {baseURL}/v1/systemone`).
 *
 * - `chooseRecord`: one `choice` question. Candidate ids never reach the model; options are keyed
 *   `c0..cN` (always safe identifiers) with the label as description, plus `none_of_the_above`. Candidates
 *   are shuffled deterministically (seeded by the state's hash) to defeat first-option bias.
 * - `selectFilters`: one `noul` question per filter value, all in one request (chunked by estimated
 *   tokens if the catalog is huge). Only catalog ids can come back.
 * - Retries and timeouts are the SDK's own; errors propagate to the caller.
 */
export function createJevDecider(options: JevDeciderOptions = {}): Decider {
  const model = options.model ?? DEFAULT_JEV_MODEL;
  const runtime: JevRuntime = {
    model,
    threshold: options.threshold ?? DEFAULT_THRESHOLD,
    cache: options.cache,
    maxRequestTokens: options.maxRequestTokens ?? DEFAULT_MAX_REQUEST_TOKENS,
    client: options.client ?? defaultClient(options, model),
    requestOptions: options.requestOptions,
  };
  return {
    chooseRecord: (input) => chooseRecord(runtime, input),
    selectFilters: (input) => selectFilters(runtime, input),
  };
}
