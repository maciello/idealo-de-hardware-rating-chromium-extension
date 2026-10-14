import {
  type ChooseRecordInput,
  createJevDecider,
  type Decider,
  type DecisionCandidate,
} from "@idealo-hw/decide";
import { type AiTestResult, AiTestResultSchema } from "../storage/ai-test-result";
import type { KeyProvider } from "./key-provider";
import { isExtensionPage } from "./openrouter-service";

const CANDIDATES: readonly DecisionCandidate[] = [
  { id: "i5-13400", label: "Intel Core i5-13400" },
  { id: "i5-13400F", label: "Intel Core i5-13400F" },
  { id: "i5-13500", label: "Intel Core i5-13500" },
];
const EXPECTED = CANDIDATES[0] as DecisionCandidate;

/** Fixed case with one unambiguous answer: exactly the model number and suffix named in `cpu_text`. */
const PROBE: ChooseRecordInput = {
  state: { probe: "idealo-hw self-test, not a real product", cpu_text: EXPECTED.label },
  question:
    "Which PassMark CPU entry is the processor named in `cpu_text`? Pick only an entry with exactly " +
    "the same model number and suffix letters (13400 is not 13400F). If no entry is exactly right, " +
    "pick none_of_the_above.",
  candidates: CANDIDATES,
};

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ERROR_CHARS = 300;

/** One attempt, no cache: the probe has to reach the model every time. */
export const probeDecider = (apiKey: string): Decider =>
  createJevDecider({
    apiKey,
    dangerouslyAllowBrowser: true,
    requestOptions: { timeout: REQUEST_TIMEOUT_MS, retry: { maxRetries: 0 } },
  });

export interface AiTestEnv {
  /** `browser.runtime.getURL("")`: the prefix every extension page URL starts with. */
  extensionBaseUrl: string;
  keys: KeyProvider;
  createDecider(apiKey: string): Decider;
  save(result: AiTestResult): Promise<void>;
  now(): Date;
}

const describeError = (error: unknown, key: string): string => {
  const message = error instanceof Error ? error.message : "Unknown error";
  return message.replaceAll(key, "[key]").slice(0, MAX_ERROR_CHARS);
};

type Outcome = Partial<Omit<AiTestResult, "at" | "expected" | "latencyMs">>;

const resultOf = (started: Date, ended: Date, outcome: Outcome): AiTestResult =>
  AiTestResultSchema.parse({
    ok: false,
    at: started.toISOString(),
    picked: null,
    expected: EXPECTED.label,
    confidence: null,
    latencyMs: Math.max(0, ended.getTime() - started.getTime()),
    model: null,
    error: null,
    ...outcome,
  });

/** BACKGROUND ONLY: reads the OpenRouter key through the key provider. */
export function createAiTestService(env: AiTestEnv) {
  let inFlight: Promise<AiTestResult> | undefined;

  const decide = async (key: string): Promise<Outcome> => {
    try {
      const choice = await env.createDecider(key).chooseRecord(PROBE);
      const picked = CANDIDATES.find((c) => c.id === choice.chosenId)?.label ?? null;
      const base = { picked, confidence: choice.confidence, model: choice.model };
      if (picked === EXPECTED.label) return { ...base, ok: true };
      return {
        ...base,
        error:
          picked === null
            ? `No confident pick (confidence ${choice.confidence.toFixed(2)}).`
            : `Picked ${picked}, expected ${EXPECTED.label}.`,
      };
    } catch (error) {
      return { error: describeError(error, key) };
    }
  };

  const probe = async (): Promise<AiTestResult> => {
    const started = env.now();
    const key = await env.keys.getOpenRouterKey();
    const outcome = key === null ? { error: "OpenRouter is not connected." } : await decide(key);
    const result = resultOf(started, env.now(), outcome);
    await env.save(result);
    return result;
  };

  return {
    /** Single flight; only the extension's own pages may spend the user's OpenRouter credit. */
    run(senderUrl: string | undefined): Promise<AiTestResult> {
      if (!isExtensionPage(senderUrl, env.extensionBaseUrl)) {
        const now = env.now();
        return Promise.resolve(
          resultOf(now, now, { error: "Only the extension's own pages may do this." }),
        );
      }
      inFlight ??= probe().finally(() => {
        inFlight = undefined;
      });
      return inFlight;
    },
  };
}
