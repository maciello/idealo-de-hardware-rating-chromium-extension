import type { FilterId } from "@idealo-hw/idealo-query";
import { stableStringify } from "../hash";
import { decisionKey, type FilterSelection, type SelectFiltersInput } from "../port";
import { CachedFilters, readCache } from "./cache-codec";
import { noulQuestion, type Questions } from "./client";
import { MAX_STATE_AND_QUESTION_TOKENS } from "./config";
import type { JevRuntime } from "./options";
import { filterQuestions } from "./questions";
import { chunkByTokens, estimateTokens } from "./tokens";

/**
 * One `noul` question per filter value, all in one request (chunked by estimated tokens if the catalog
 * is huge). Only catalog ids can come back.
 */
export async function selectFilters(
  runtime: JevRuntime,
  input: SelectFiltersInput,
): Promise<FilterSelection> {
  const { client, model, threshold, cache, maxRequestTokens, requestOptions } = runtime;
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
        for (const q of chunk) probabilityById.set(q.filterId, hit.probabilities[q.filterId] ?? 0);
        return;
      }
      const names = new Map<string, FilterId>();
      const noulQuestions: Questions = {};
      chunk.forEach((q, position) => {
        const name = `q${position}`;
        names.set(name, q.filterId);
        noulQuestions[name] = noulQuestion(q.text);
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
