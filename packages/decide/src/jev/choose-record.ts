import { orderBySeed, sha256Hex, stableStringify } from "../hash";
import {
  type ChooseRecordInput,
  type DecisionCandidate,
  decisionKey,
  NONE_OF_THE_ABOVE,
  type RecordChoice,
} from "../port";
import { CachedChoice, readCache } from "./cache-codec";
import { choiceQuestion } from "./client";
import { MAX_CHOICE_CANDIDATES } from "./config";
import type { JevRuntime } from "./options";

function applyChoiceThreshold(cached: CachedChoice, threshold: number): RecordChoice {
  const accepted = cached.topId !== null && cached.confidence >= threshold;
  return {
    chosenId: accepted ? cached.topId : null,
    confidence: cached.confidence,
    probabilities: cached.probabilities,
    model: cached.model,
  };
}

/**
 * One `choice` question. Candidate ids never reach the model; options are keyed `c0..cN` (always safe
 * identifiers) with the label as description, plus `none_of_the_above`. Candidates are shuffled
 * deterministically (seeded by the state's hash) to defeat first-option bias.
 */
export async function chooseRecord(
  runtime: JevRuntime,
  input: ChooseRecordInput,
): Promise<RecordChoice> {
  const { client, model, threshold, cache, requestOptions } = runtime;
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
      questions: { pick: choiceQuestion(input.question, criteria) },
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
