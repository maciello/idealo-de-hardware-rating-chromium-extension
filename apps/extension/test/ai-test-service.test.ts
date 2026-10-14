import type { ChooseRecordInput, Decider, RecordChoice } from "@idealo-hw/decide";
import { describe, expect, it } from "vitest";
import { type AiTestEnv, createAiTestService } from "../src/ai/ai-test-service";
import type { AiTestResult } from "../src/storage/ai-test-result";

const BASE = "chrome-extension://abc/";
const KEY = "sk-or-secret-key";
const MODEL = "typesafe/jev-1.13-20260917";

const choice = (chosenId: string | null, confidence = 0.97): RecordChoice => ({
  chosenId,
  confidence,
  probabilities: {},
  model: MODEL,
});

interface Harness {
  env: AiTestEnv;
  saved: AiTestResult[];
  requests: ChooseRecordInput[];
  keyReads: () => number;
}

function harness(
  decide: (input: ChooseRecordInput) => Promise<RecordChoice>,
  key: string | null = KEY,
): Harness {
  const saved: AiTestResult[] = [];
  const requests: ChooseRecordInput[] = [];
  let keyReads = 0;
  const clock = [Date.parse("2026-10-14T10:00:00.000Z"), Date.parse("2026-10-14T10:00:00.250Z")];
  return {
    saved,
    requests,
    keyReads: () => keyReads,
    env: {
      extensionBaseUrl: BASE,
      keys: {
        async getOpenRouterKey() {
          keyReads++;
          return key;
        },
      },
      createDecider: (apiKey): Decider => {
        expect(apiKey).toBe(KEY);
        return {
          chooseRecord: (input) => {
            requests.push(input);
            return decide(input);
          },
          selectFilters: async () => ({ filterIds: [], perFilter: [], model: MODEL }),
        };
      },
      save: async (result) => void saved.push(result),
      now: () => new Date(clock.shift() ?? clock.length),
    },
  };
}

const FROM_OPTIONS = `${BASE}options.html`;

describe("createAiTestService", () => {
  it("runs one decision on the fixed probe and reports pick, model and latency", async () => {
    const h = harness(async () => choice("i5-13400"));
    const result = await createAiTestService(h.env).run(FROM_OPTIONS);
    expect(result).toEqual({
      ok: true,
      at: "2026-10-14T10:00:00.000Z",
      picked: "Intel Core i5-13400",
      expected: "Intel Core i5-13400",
      confidence: 0.97,
      latencyMs: 250,
      model: MODEL,
      error: null,
    });
    expect(h.saved).toEqual([result]);
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0]?.state.cpu_text).toBe("Intel Core i5-13400");
    expect(h.requests[0]?.candidates.map((c) => c.label)).toEqual([
      "Intel Core i5-13400",
      "Intel Core i5-13400F",
      "Intel Core i5-13500",
    ]);
  });

  it("fails when the decider picks a near miss", async () => {
    const h = harness(async () => choice("i5-13400F"));
    const result = await createAiTestService(h.env).run(FROM_OPTIONS);
    expect(result).toMatchObject({
      ok: false,
      picked: "Intel Core i5-13400F",
      error: "Picked Intel Core i5-13400F, expected Intel Core i5-13400.",
      model: MODEL,
    });
  });

  it("fails when the decider is not confident enough to pick", async () => {
    const h = harness(async () => choice(null, 0.55));
    const result = await createAiTestService(h.env).run(FROM_OPTIONS);
    expect(result).toMatchObject({
      ok: false,
      picked: null,
      error: "No confident pick (confidence 0.55).",
    });
  });

  it("reports a failing call without ever echoing the key", async () => {
    const h = harness(async () => {
      throw new Error(`401 invalid key ${KEY}`);
    });
    const result = await createAiTestService(h.env).run(FROM_OPTIONS);
    expect(result).toMatchObject({ ok: false, picked: null, model: null });
    expect(result.error).toBe("401 invalid key [key]");
    expect(JSON.stringify(h.saved)).not.toContain(KEY);
  });

  it("says so when OpenRouter is not connected, without calling the decider", async () => {
    const h = harness(async () => choice("i5-13400"), null);
    const result = await createAiTestService(h.env).run(FROM_OPTIONS);
    expect(result).toMatchObject({ ok: false, error: "OpenRouter is not connected." });
    expect(h.requests).toEqual([]);
  });

  it("refuses senders that are not extension pages, without reading the key or storing", async () => {
    const h = harness(async () => choice("i5-13400"));
    const service = createAiTestService(h.env);
    for (const sender of ["https://www.idealo.de/", undefined, "chrome-extension://other/x"]) {
      const result = await service.run(sender);
      expect(result).toMatchObject({
        ok: false,
        error: "Only the extension's own pages may do this.",
      });
    }
    expect(h.keyReads()).toBe(0);
    expect(h.saved).toEqual([]);
  });

  it("joins a probe that is already running", async () => {
    const h = harness(async () => choice("i5-13400"));
    const service = createAiTestService(h.env);
    const [a, b] = await Promise.all([service.run(FROM_OPTIONS), service.run(FROM_OPTIONS)]);
    expect(a).toBe(b);
    expect(h.requests).toHaveLength(1);
  });
});
