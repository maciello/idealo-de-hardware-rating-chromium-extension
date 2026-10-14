import { afterEach, describe, expect, it, vi } from "vitest";
import { createJevDecider, type DecisionCandidate, OPENROUTER_BASE_URL } from "../../src";
import { catalog } from "../catalog-fixture";

const candidates: DecisionCandidate[] = [{ id: "101", label: "Testcorp Chip 1000" }];
const state = { cpu_text: "Testcorp Chip 1000 Pro Edition", product_title: "Widget" };
const question = "Which entry is the chip in `cpu_text`?";

describe("createJevDecider default client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("needs an explicit apiKey and does not fall back to the environment", () => {
    vi.stubEnv("TYPESAFE_API_KEY", "from-env");
    expect(() => createJevDecider()).toThrow(TypeError);
    expect(() => createJevDecider({ apiKey: "  " })).toThrow(TypeError);
    vi.unstubAllEnvs();
  });

  it("posts to the OpenRouter root with the pinned model and the injected key", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      Response.json({
        model: "typesafe/jev-1.13-20260917",
        answers: {
          pick: {
            type: "choice",
            choice: "c0",
            confidence: 0.9,
            probabilities: { c0: 0.9, none_of_the_above: 0.1 },
          },
        },
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const decider = createJevDecider({ apiKey: "sk-or-test-key" });
    const result = await decider.chooseRecord({
      state,
      question,
      candidates: candidates.slice(0, 1),
    });
    expect(result).toMatchObject({ chosenId: "101", model: "typesafe/jev-1.13-20260917" });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://openrouter.ai/api/v1/systemone");
    expect(OPENROUTER_BASE_URL).toBe("https://openrouter.ai/api");
    expect(JSON.parse(String(init?.body))).toMatchObject({ model: "typesafe/jev-1.13" });
    expect(JSON.stringify(init?.headers)).toContain("sk-or-test-key");
  });

  it("honours a custom baseURL", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      Response.json({
        model: "m",
        answers: { q0: { type: "noul", noul: 0.9 } },
        usage: { input_tokens: 0, output_tokens: 0 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const one = {
      ...catalog,
      groups: [{ attributeId: "1", name: "G", filters: [{ filterId: "42" as never, label: "L" }] }],
      manufacturers: [],
    };
    const result = await createJevDecider({
      apiKey: "k",
      baseURL: "https://example.test/root",
    }).selectFilters({
      request: "x",
      catalog: one,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://example.test/root/v1/systemone");
    expect(result.filterIds).toEqual(["42"]);
  });
});
