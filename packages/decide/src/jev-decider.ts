import type { FilterCatalog, FilterId } from "@idealo-hw/idealo-query";
import {
  choice,
  noul,
  type Questions,
  type RequestOptions,
  type SystemOneRequest,
  type SystemOneResult,
  TypeSafeClient,
} from "@typesafe-ai/sdk";
import { z } from "zod";
import { type DecisionCache, decisionKey } from "./cache";
import {
  type ChooseRecordInput,
  type Decider,
  type DecisionCandidate,
  type FilterSelection,
  NONE_OF_THE_ABOVE,
  type RecordChoice,
  type SelectFiltersInput,
} from "./decider";
import { orderBySeed, sha256Hex, stableStringify } from "./hash";

/**
 * Pinned: thresholds are calibrated per model version, so never `jev-latest`. OpenRouter maps the bare id
 * "jev-1.13" to this one and answers with the dated snapshot it served (e.g. "typesafe/jev-1.13-20260917").
 */
export const DEFAULT_JEV_MODEL = "typesafe/jev-1.13";
/**
 * OpenRouter root. The SDK appends "/v1/systemone", giving POST https://openrouter.ai/api/v1/systemone,
 * which is wire-compatible with api.typesafe.ai.
 */
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api";
export const DEFAULT_THRESHOLD = 0.7;
/** Jev choice questions hold 255 options; one is `none_of_the_above`. */
export const MAX_CHOICE_CANDIDATES = 254;
/** OpenRouter serves Jev 1.13 with a 32k context (TypeSafe direct: 64k); leave headroom for the rough estimate. */
export const DEFAULT_MAX_REQUEST_TOKENS = 24_000;
/** Jev 1.13 limit for the state plus the single longest question. */
const MAX_STATE_AND_QUESTION_TOKENS = 32_000;

/** The one method of `TypeSafeClient` this package uses; tests inject a fake that records requests. */
export interface SystemOneClient {
  systemOne<const Q extends Questions>(
    request: SystemOneRequest<Q>,
    options?: RequestOptions,
  ): PromiseLike<SystemOneResult<Q>>;
}

export interface JevDeciderOptions {
  /** Defaults to a `TypeSafeClient` built from `apiKey` and `baseURL`. */
  readonly client?: SystemOneClient;
  /**
   * OpenRouter API key, injected by the caller (the extension reads it from its storage). Required when
   * `client` is omitted; library code never reads the environment and never logs the key.
   */
  readonly apiKey?: string;
  /** API root without "/v1/systemone". Default: OpenRouter. Used only when `client` is omitted. */
  readonly baseURL?: string;
  /** Pinned model for every request. Default `typesafe/jev-1.13`. */
  readonly model?: string;
  /** Minimum confidence (choice) or yes-probability (filters) to accept. Default 0.7. */
  readonly threshold?: number;
  readonly cache?: DecisionCache;
  /**
   * Needed when the default client runs in a browser-like runtime (an extension service worker);
   * the key then lives in extension storage, never in a page (docs/adr/0011 key_handling).
   */
  readonly dangerouslyAllowBrowser?: boolean;
  /** Per-call timeout/retry/abort settings. The SDK's own retry and timeout apply otherwise. */
  readonly requestOptions?: RequestOptions;
  /** Estimated-token budget per request when chunking filter questions. Default 24,000. */
  readonly maxRequestTokens?: number;
}

/** Rough token estimate, deliberately pessimistic for German text and digits. */
const estimateTokens = (text: string): number => Math.ceil(text.length / 2.5);

const CachedChoice = z.object({
  topId: z.string().nullable(),
  confidence: z.number(),
  probabilities: z.record(z.string(), z.number()),
  model: z.string(),
});
type CachedChoice = z.infer<typeof CachedChoice>;

const CachedFilters = z.object({
  probabilities: z.record(z.string(), z.number()),
  model: z.string(),
});
type CachedFilters = z.infer<typeof CachedFilters>;

async function readCache<T>(
  cache: DecisionCache | undefined,
  key: string,
  schema: z.ZodType<T>,
): Promise<T | undefined> {
  if (cache === undefined) return undefined;
  const parsed = schema.safeParse(await cache.get(key));
  return parsed.success ? parsed.data : undefined;
}

interface FilterQuestion {
  readonly filterId: FilterId;
  readonly text: string;
}

/** Every distinct catalog filter value (and manufacturer search filter) as one yes/no question text. */
function filterQuestions(catalog: FilterCatalog): FilterQuestion[] {
  const seen = new Set<FilterId>();
  const questions: FilterQuestion[] = [];
  const add = (filterId: FilterId, group: string, label: string): void => {
    if (seen.has(filterId) || label.trim() === "") return;
    seen.add(filterId);
    questions.push({
      filterId,
      text: `Does the shopping request in \`request\` ask for the product filter "${group}: ${label.trim()}"?`,
    });
  };
  for (const group of catalog.groups) {
    for (const filter of group.filters) add(filter.filterId, group.name, filter.label);
  }
  for (const manufacturer of catalog.manufacturers) {
    if (manufacturer.searchFilterId !== undefined) {
      add(manufacturer.searchFilterId, "Manufacturer", manufacturer.name);
    }
  }
  return questions;
}

/** Greedy chunks whose estimated size stays within the budget; order is preserved. */
function chunkByTokens(
  questions: readonly FilterQuestion[],
  budget: number,
  fixedTokens: number,
): FilterQuestion[][] {
  const chunks: FilterQuestion[][] = [];
  let current: FilterQuestion[] = [];
  let used = fixedTokens;
  for (const question of questions) {
    const cost = estimateTokens(question.text) + 16;
    if (current.length > 0 && used + cost > budget) {
      chunks.push(current);
      current = [];
      used = fixedTokens;
    }
    current.push(question);
    used += cost;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

function applyChoiceThreshold(cached: CachedChoice, threshold: number): RecordChoice {
  const accepted = cached.topId !== null && cached.confidence >= threshold;
  return {
    chosenId: accepted ? cached.topId : null,
    confidence: cached.confidence,
    probabilities: cached.probabilities,
    model: cached.model,
  };
}

function defaultClient(options: JevDeciderOptions, model: string): SystemOneClient {
  // The SDK would silently fall back to the TYPESAFE_API_KEY environment variable; the key must be explicit.
  if (options.apiKey === undefined || options.apiKey.trim() === "") {
    throw new TypeError("createJevDecider needs an apiKey (OpenRouter) or a client");
  }
  return new TypeSafeClient({
    apiKey: options.apiKey,
    baseURL: options.baseURL ?? OPENROUTER_BASE_URL,
    defaultModel: model,
    ...(options.dangerouslyAllowBrowser === undefined
      ? {}
      : { dangerouslyAllowBrowser: options.dangerouslyAllowBrowser }),
  });
}

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
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const cache = options.cache;
  const maxRequestTokens = options.maxRequestTokens ?? DEFAULT_MAX_REQUEST_TOKENS;
  const client = options.client ?? defaultClient(options, model);
  const requestOptions = options.requestOptions;

  async function chooseRecord(input: ChooseRecordInput): Promise<RecordChoice> {
    const unique: DecisionCandidate[] = [];
    const ids = new Set<string>();
    for (const candidate of input.candidates) {
      if (ids.has(candidate.id)) continue;
      ids.add(candidate.id);
      unique.push(candidate);
    }
    if (unique.length === 0) {
      return { chosenId: null, confidence: 0, probabilities: {}, model };
    }
    if (unique.length > MAX_CHOICE_CANDIDATES) {
      throw new RangeError(
        `chooseRecord accepts at most ${MAX_CHOICE_CANDIDATES} candidates, got ${unique.length}`,
      );
    }

    const key = await decisionKey({
      model,
      state: input.state,
      question: input.question,
      candidateIds: unique.map((c) => c.id),
    });
    const hit = await readCache(cache, key, CachedChoice);
    if (hit !== undefined) return applyChoiceThreshold(hit, threshold);

    const seed = await sha256Hex(stableStringify(input.state));
    const shuffled = await orderBySeed(unique, seed, (c) => c.id);
    const idByKey = new Map<string, string>();
    const criteria: Record<string, string> = {};
    shuffled.forEach((candidate, position) => {
      const optionKey = `c${position}`;
      idByKey.set(optionKey, candidate.id);
      criteria[optionKey] = candidate.label;
    });
    criteria[NONE_OF_THE_ABOVE] = "None of the other options is an exact match.";

    const { answers, model: servedModel } = await client.systemOne(
      {
        state: { ...input.state },
        questions: { pick: choice(input.question, criteria) },
        model,
      },
      requestOptions,
    );
    const answer = answers.pick;
    const probabilities: Record<string, number> = {};
    for (const [optionKey, probability] of Object.entries(answer.probabilities)) {
      const id = idByKey.get(optionKey);
      if (id !== undefined) probabilities[id] = probability;
      else if (optionKey === NONE_OF_THE_ABOVE) probabilities[NONE_OF_THE_ABOVE] = probability;
    }
    const topId =
      answer.choice === NONE_OF_THE_ABOVE ? null : (idByKey.get(answer.choice) ?? undefined);
    if (topId === undefined) {
      throw new Error(`Jev answered with an option that was not offered: ${answer.choice}`);
    }
    const result: CachedChoice = {
      topId,
      confidence: answer.confidence,
      probabilities,
      model: servedModel,
    };
    await cache?.set(key, result);
    return applyChoiceThreshold(result, threshold);
  }

  async function selectFilters(input: SelectFiltersInput): Promise<FilterSelection> {
    const questions = filterQuestions(input.catalog);
    if (questions.length === 0) return { filterIds: [], perFilter: [], model };

    const state = { request: input.request };
    const stateTokens = estimateTokens(stableStringify(state));
    const longest = Math.max(...questions.map((q) => estimateTokens(q.text)));
    if (stateTokens + longest > MAX_STATE_AND_QUESTION_TOKENS) {
      throw new RangeError("request text is too long for one Jev request (32k token limit)");
    }

    const chunks = chunkByTokens(questions, maxRequestTokens, stateTokens);
    let servedModel = model;
    const probabilityById = new Map<FilterId, number>();

    await Promise.all(
      chunks.map(async (chunk) => {
        const key = await decisionKey({
          model,
          state,
          question: "select_filters",
          candidateIds: chunk.map((q) => q.filterId),
        });
        const hit = await readCache(cache, key, CachedFilters);
        if (hit !== undefined && chunk.every((q) => hit.probabilities[q.filterId] !== undefined)) {
          servedModel = hit.model;
          for (const q of chunk)
            probabilityById.set(q.filterId, hit.probabilities[q.filterId] ?? 0);
          return;
        }
        const names = new Map<string, FilterId>();
        const noulQuestions: Questions = {};
        chunk.forEach((q, position) => {
          const name = `q${position}`;
          names.set(name, q.filterId);
          noulQuestions[name] = noul(q.text);
        });
        const result = await client.systemOne(
          { state, questions: noulQuestions, model },
          requestOptions,
        );
        servedModel = result.model;
        const probabilities: Record<string, number> = {};
        for (const [name, filterId] of names) {
          const answer = result.answers[name];
          if (answer === undefined || answer.type !== "noul") {
            throw new Error(`Jev response is missing the answer for question ${name}`);
          }
          probabilities[filterId] = answer.noul;
          probabilityById.set(filterId, answer.noul);
        }
        await cache?.set(key, { probabilities, model: result.model } satisfies CachedFilters);
      }),
    );

    const perFilter = questions.map((q) => ({
      filterId: q.filterId,
      probability: probabilityById.get(q.filterId) ?? 0,
    }));
    return {
      filterIds: perFilter.filter((f) => f.probability >= threshold).map((f) => f.filterId),
      perFilter,
      model: servedModel,
    };
  }

  return { chooseRecord, selectFilters };
}
