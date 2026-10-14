import type { SystemOneRequest } from "@typesafe-ai/sdk";
import fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createJevDecider,
  createMemoryDecisionCache,
  DEFAULT_JEV_MODEL,
  type DecisionCandidate,
  decisionKey,
  MAX_CHOICE_CANDIDATES,
  NONE_OF_THE_ABOVE,
  noopDecider,
  OPENROUTER_BASE_URL,
} from "../src";
import { catalog } from "./catalog-fixture";
import { choiceOf, fakeClient, noulOf, pickByLabel, pickNone } from "./fake-client";

const candidates: DecisionCandidate[] = [
  { id: "101", label: "Testcorp Chip 1000" },
  { id: "102", label: "Testcorp Chip 1000 Pro" },
  { id: "103:2", label: "Testcorp Chip 1000 Max" },
  { id: "a b/c", label: "Testcorp Chip 2000" },
  { id: "105", label: "Testcorp Chip 3000" },
  { id: "106", label: "Testcorp Chip 4000" },
  { id: "107", label: "Testcorp Chip 5000" },
  { id: "108", label: "Testcorp Chip 6000" },
];
const state = { cpu_text: "Testcorp Chip 1000 Pro Edition", product_title: "Widget" };
const question = "Which entry is the chip in `cpu_text`?";

const labelOrder = (request: SystemOneRequest): string[] =>
  Object.values(choiceOf(request).criteria).map(String);

describe("createJevDecider.chooseRecord", () => {
  it("sends one choice question with safe option keys and none_of_the_above, on the pinned model", async () => {
    const client = fakeClient((req) => pickByLabel(req, "Testcorp Chip 1000 Pro", 0.95));
    const decider = createJevDecider({ client });
    await decider.chooseRecord({ state, question, candidates });

    expect(client.requests).toHaveLength(1);
    const [request] = client.requests as [SystemOneRequest];
    expect(request.model).toBe("typesafe/jev-1.13");
    expect(DEFAULT_JEV_MODEL).toBe("typesafe/jev-1.13");
    expect(request.state).toEqual(state);
    expect(Object.keys(request.questions)).toEqual(["pick"]);
    const q = choiceOf(request);
    expect(q.type).toBe("choice");
    expect(q.instructions).toBe(question);
    const keys = Object.keys(q.criteria);
    expect(keys).toContain(NONE_OF_THE_ABOVE);
    expect(keys.at(-1)).toBe(NONE_OF_THE_ABOVE);
    const optionKeys = keys.filter((k) => k !== NONE_OF_THE_ABOVE);
    expect(optionKeys).toEqual(candidates.map((_, i) => `c${i}`));
    expect(optionKeys.every((k) => /^c\d+$/.test(k))).toBe(true);
    // Labels are descriptions; ids (with their unsafe characters) never leave the process.
    expect(new Set(optionKeys.map((k) => q.criteria[k]))).toEqual(
      new Set(candidates.map((c) => c.label)),
    );
    expect(JSON.stringify(request)).not.toContain("a b/c");
  });

  it("maps the chosen option key back to the candidate id", async () => {
    const client = fakeClient((req) => pickByLabel(req, "Testcorp Chip 2000", 0.9));
    const result = await createJevDecider({ client }).chooseRecord({ state, question, candidates });
    expect(result.chosenId).toBe("a b/c");
    expect(result.confidence).toBe(0.9);
    // The served (dated) snapshot is reported, not the alias that was requested.
    expect(result.model).toBe("typesafe/jev-1.13-20260917");
    expect(Object.keys(result.probabilities).sort()).toEqual(
      [...candidates.map((c) => c.id), NONE_OF_THE_ABOVE].sort(),
    );
    expect(result.probabilities["a b/c"]).toBe(0.9);
  });

  it("shuffles candidates, identically for the same state and differently for another state", async () => {
    const run = async (s: Record<string, string>, input = candidates) => {
      const client = fakeClient((req) => pickNone(req, 0.9));
      await createJevDecider({ client }).chooseRecord({ state: s, question, candidates: input });
      return labelOrder(client.requests[0] as SystemOneRequest);
    };
    const first = await run(state);
    expect(await run(state)).toEqual(first);
    // Input order does not matter either: the shuffle is a function of state and candidate ids.
    expect(await run(state, [...candidates].reverse())).toEqual(first);
    // Not simply best-first: rank order is hidden from the model.
    expect(first.slice(0, -1)).not.toEqual(candidates.map((c) => c.label));
    expect(new Set(first)).toEqual(new Set([...candidates.map((c) => c.label), first.at(-1)]));
    const other = await run({ ...state, cpu_text: "Something else entirely" });
    expect(other).not.toEqual(first);
  });

  it("respects the threshold, including the boundary", async () => {
    const at = (confidence: number, threshold?: number) =>
      createJevDecider({
        client: fakeClient((req) => pickByLabel(req, "Testcorp Chip 1000", confidence)),
        ...(threshold === undefined ? {} : { threshold }),
      }).chooseRecord({ state, question, candidates });
    expect((await at(0.7)).chosenId).toBe("101");
    expect((await at(0.69)).chosenId).toBeNull();
    expect((await at(0.69)).confidence).toBe(0.69);
    expect((await at(0.5, 0.4)).chosenId).toBe("101");
    expect((await at(0.95, 0.99)).chosenId).toBeNull();
  });

  it("returns null when the model picks none_of_the_above, even when confident", async () => {
    const client = fakeClient((req) => pickNone(req, 0.99));
    const result = await createJevDecider({ client }).chooseRecord({ state, question, candidates });
    expect(result.chosenId).toBeNull();
    expect(result.confidence).toBe(0.99);
  });

  it("serves the second identical call from the cache and still applies the threshold", async () => {
    const cache = createMemoryDecisionCache();
    const client = fakeClient((req) => pickByLabel(req, "Testcorp Chip 1000", 0.8));
    const decide = (threshold: number) =>
      createJevDecider({ client, cache, threshold }).chooseRecord({ state, question, candidates });
    expect((await decide(0.7)).chosenId).toBe("101");
    expect((await decide(0.7)).chosenId).toBe("101");
    expect(client.requests).toHaveLength(1);
    expect(cache.size).toBe(1);
    // A stricter threshold reuses the stored answer but rejects it.
    expect((await decide(0.9)).chosenId).toBeNull();
    expect(client.requests).toHaveLength(1);
  });

  it("misses the cache when state, question, model or candidate set differ, but not on candidate order", async () => {
    const cache = createMemoryDecisionCache();
    const client = fakeClient((req) => pickByLabel(req, "Testcorp Chip 1000", 0.8));
    const decider = createJevDecider({ client, cache });
    await decider.chooseRecord({ state, question, candidates });
    await decider.chooseRecord({ state, question, candidates: [...candidates].reverse() });
    expect(client.requests).toHaveLength(1);
    await decider.chooseRecord({ state: { ...state, extra: "x" }, question, candidates });
    await decider.chooseRecord({ state, question: `${question} again`, candidates });
    await decider.chooseRecord({ state, question, candidates: candidates.slice(0, 4) });
    await createJevDecider({ client, cache, model: "typesafe/jev-1.12" }).chooseRecord({
      state,
      question,
      candidates,
    });
    expect(client.requests).toHaveLength(5);
    expect(client.requests.at(-1)?.model).toBe("typesafe/jev-1.12");
  });

  it("stores the served model snapshot in the cache entry and returns it on a hit", async () => {
    const cache = createMemoryDecisionCache();
    const client = fakeClient((req) => pickByLabel(req, "Testcorp Chip 1000", 0.8));
    const decider = createJevDecider({ client, cache });
    await decider.chooseRecord({ state, question, candidates });
    const hit = await decider.chooseRecord({ state, question, candidates });
    expect(hit.model).toBe("typesafe/jev-1.13-20260917");
    const key = await decisionKey({
      model: "typesafe/jev-1.13",
      state,
      question,
      candidateIds: candidates.map((c) => c.id),
    });
    expect(await cache.get(key)).toMatchObject({
      model: "typesafe/jev-1.13-20260917",
      topId: "101",
    });
  });

  it("ignores a corrupt cache entry instead of trusting it", async () => {
    const cache = createMemoryDecisionCache();
    const client = fakeClient((req) => pickByLabel(req, "Testcorp Chip 1000", 0.8));
    const decider = createJevDecider({ client, cache });
    await decider.chooseRecord({ state, question, candidates });
    const real = cache.get.bind(cache);
    cache.get = async (key) => ((await real(key)) === undefined ? undefined : { nonsense: true });
    await decider.chooseRecord({ state, question, candidates });
    expect(client.requests).toHaveLength(2);
  });

  it("makes no request without candidates and rejects more than 254", async () => {
    const client = fakeClient((req) => pickNone(req, 0.9));
    const decider = createJevDecider({ client });
    expect((await decider.chooseRecord({ state, question, candidates: [] })).chosenId).toBeNull();
    expect(client.requests).toHaveLength(0);
    const many = Array.from({ length: MAX_CHOICE_CANDIDATES + 1 }, (_, i) => ({
      id: String(i),
      label: `Chip ${i}`,
    }));
    await expect(decider.chooseRecord({ state, question, candidates: many })).rejects.toThrow(
      RangeError,
    );
    const max = many.slice(0, MAX_CHOICE_CANDIDATES);
    await decider.chooseRecord({ state, question, candidates: max });
    expect(Object.keys(choiceOf(client.requests[0] as SystemOneRequest).criteria)).toHaveLength(
      255,
    );
  });

  it("collapses duplicate candidate ids", async () => {
    const client = fakeClient((req) => pickNone(req, 0.9));
    await createJevDecider({ client }).chooseRecord({
      state,
      question,
      candidates: [candidates[0], candidates[0], candidates[1]] as DecisionCandidate[],
    });
    expect(Object.keys(choiceOf(client.requests[0] as SystemOneRequest).criteria)).toHaveLength(3);
  });

  it("refuses an answer that names an option that was never offered", async () => {
    const client = fakeClient(() => ({
      pick: { type: "choice", choice: "c999", confidence: 0.99, probabilities: { c999: 0.99 } },
    }));
    await expect(
      createJevDecider({ client }).chooseRecord({ state, question, candidates }),
    ).rejects.toThrow(/not offered/);
  });

  it("only ever returns an offered id or null (property)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 12 }), { minLength: 1, maxLength: 30 }),
        fc.nat(40),
        fc.double({ min: 0, max: 1, noNaN: true }),
        async (ids, pick, confidence) => {
          const cands = ids.map((id) => ({ id, label: `Label ${id}` }));
          const client = fakeClient((req) => {
            const keys = Object.keys(choiceOf(req).criteria);
            const key = keys[pick % keys.length] as string;
            return {
              pick: {
                type: "choice",
                choice: key,
                confidence,
                probabilities: { [key]: confidence },
              },
            };
          });
          const result = await createJevDecider({ client }).chooseRecord({
            state,
            question,
            candidates: cands,
          });
          expect(result.chosenId === null || ids.includes(result.chosenId)).toBe(true);
          const request = client.requests[0] as SystemOneRequest;
          const optionKeys = Object.keys(choiceOf(request).criteria).filter(
            (k) => k !== NONE_OF_THE_ABOVE,
          );
          expect(optionKeys).toHaveLength(ids.length);
        },
      ),
      { numRuns: 60 },
    );
  });
});

describe("createJevDecider.selectFilters", () => {
  const allFilterIds = catalog.groups.flatMap((g) => g.filters.map((f) => f.filterId));
  const yesFor = (labels: readonly string[]) => (req: SystemOneRequest) =>
    Object.fromEntries(
      Object.keys(req.questions).map((name) => {
        const text = String(noulOf(req, name).instructions);
        return [name, { type: "noul", noul: labels.some((l) => text.includes(l)) ? 0.93 : 0.04 }];
      }),
    );

  it("asks one noul question per filter value in a single request and returns catalog ids only", async () => {
    const client = fakeClient(yesFor(["Intel Core i7", "32 GB"]));
    const result = await createJevDecider({ client }).selectFilters({
      request: "Notebook mit Intel i7 und 32 GB RAM",
      catalog,
    });
    expect(client.requests).toHaveLength(1);
    const [request] = client.requests as [SystemOneRequest];
    expect(request.model).toBe("typesafe/jev-1.13");
    expect(request.state).toEqual({ request: "Notebook mit Intel i7 und 32 GB RAM" });
    // 6 group values + the manufacturer that has a searchFilterId.
    expect(Object.keys(request.questions)).toHaveLength(allFilterIds.length + 1);
    expect(Object.values(request.questions).every((q) => q.type === "noul")).toBe(true);
    expect(result.filterIds.map(String)).toEqual(["1147301", "1309393"]);
    expect(result.perFilter).toHaveLength(allFilterIds.length + 1);
    expect(result.perFilter.find((f) => f.filterId === ("1147301" as never))?.probability).toBe(
      0.93,
    );
    const known = new Set<string>([...allFilterIds, "5550077"]);
    expect(result.perFilter.every((f) => known.has(f.filterId))).toBe(true);
    expect(result.model).toBe("typesafe/jev-1.13-20260917");
  });

  it("respects the threshold", async () => {
    const probabilities = [0.69, 0.7, 0.71, 0.1, 0.9, 0.5, 0.3];
    const scripted = fakeClient((req) =>
      Object.fromEntries(
        Object.keys(req.questions).map((name, i) => [
          name,
          { type: "noul", noul: probabilities[i] },
        ]),
      ),
    );
    const result = await createJevDecider({ client: scripted }).selectFilters({
      request: "x",
      catalog,
    });
    expect(result.perFilter.map((f) => f.probability)).toEqual(probabilities);
    expect(result.filterIds).toHaveLength(3);
    const strict = await createJevDecider({ client: scripted, threshold: 0.9 }).selectFilters({
      request: "x",
      catalog,
    });
    expect(strict.filterIds).toHaveLength(1);
  });

  it("chunks requests when the catalog exceeds the token budget and never drops a filter", async () => {
    const client = fakeClient(yesFor(["16 GB"]));
    const result = await createJevDecider({ client, maxRequestTokens: 100 }).selectFilters({
      request: "16 GB RAM",
      catalog,
    });
    expect(client.requests.length).toBeGreaterThan(1);
    const asked = client.requests.flatMap((r) => Object.keys(r.questions));
    expect(asked).toHaveLength(allFilterIds.length + 1);
    expect(result.perFilter).toHaveLength(allFilterIds.length + 1);
    expect(result.filterIds.map(String)).toEqual(["101483660"]);
  });

  it("handles a group with more than 255 values (noul is per value)", async () => {
    const big = {
      ...catalog,
      groups: [
        {
          attributeId: "9",
          name: "Big",
          filters: Array.from({ length: 300 }, (_, i) => ({
            filterId: String(900000 + i) as never,
            label: `Value ${i}`,
          })),
        },
      ],
      manufacturers: [],
    };
    const client = fakeClient(yesFor(["Value 7"]));
    const result = await createJevDecider({ client }).selectFilters({
      request: "seven",
      catalog: big,
    });
    expect(client.requests).toHaveLength(1);
    expect(Object.keys(client.requests[0]?.questions ?? {})).toHaveLength(300);
    expect(result.filterIds.map(String)).toEqual(
      ["900007", "900070"]
        .slice(0, 0)
        .concat(
          big.groups[0]?.filters
            .filter((f) => f.label.includes("Value 7"))
            .map((f) => String(f.filterId)) ?? [],
        ),
    );
  });

  it("caches per chunk so a rerun makes no request", async () => {
    const cache = createMemoryDecisionCache();
    const client = fakeClient(yesFor(["Intel Core i7"]));
    const decider = createJevDecider({ client, cache, maxRequestTokens: 100 });
    const first = await decider.selectFilters({ request: "i7", catalog });
    const calls = client.requests.length;
    const second = await decider.selectFilters({ request: "i7", catalog });
    expect(client.requests).toHaveLength(calls);
    expect(second).toEqual(first);
    await decider.selectFilters({ request: "another request", catalog });
    expect(client.requests.length).toBeGreaterThan(calls);
  });

  it("makes no request for an empty catalog", async () => {
    const client = fakeClient(() => ({}));
    const result = await createJevDecider({ client }).selectFilters({
      request: "anything",
      catalog: { ...catalog, groups: [], manufacturers: [] },
    });
    expect(result).toMatchObject({ filterIds: [], perFilter: [] });
    expect(client.requests).toHaveLength(0);
  });

  it("returns a subset of catalog ids for any probabilities (property)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { maxLength: 12 }),
        async (ps) => {
          const client = fakeClient((req) =>
            Object.fromEntries(
              Object.keys(req.questions).map((name, i) => [
                name,
                { type: "noul", noul: ps[i % Math.max(ps.length, 1)] ?? 0 },
              ]),
            ),
          );
          const result = await createJevDecider({ client }).selectFilters({
            request: "r",
            catalog,
          });
          const known = new Set<string>([...allFilterIds, "5550077"]);
          expect(result.filterIds.every((id) => known.has(id))).toBe(true);
        },
      ),
      { numRuns: 40 },
    );
  });
});

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

describe("noopDecider", () => {
  it("never decides", async () => {
    expect(await noopDecider.chooseRecord({ state, question, candidates })).toMatchObject({
      chosenId: null,
      probabilities: {},
    });
    expect(await noopDecider.selectFilters({ request: "x", catalog })).toMatchObject({
      filterIds: [],
      perFilter: [],
    });
  });
});
