import type { SystemOneRequest } from "@typesafe-ai/sdk";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createJevDecider, createMemoryDecisionCache } from "../../src";
import { catalog } from "../catalog-fixture";
import { fakeClient, noulOf } from "../fake-client";

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
