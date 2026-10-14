import { describe, expect, it } from "vitest";
import {
  categoryId,
  emptyQuery,
  type FacetPlan,
  filterId,
  type ModelScorer,
  parseSearchResult,
  planRequirements,
} from "../src/index";
import fixture from "./fixtures/catalog-groups.3751-3020.json" with { type: "json" };

/** Real filter groups of Notebooks (3751) and PC-Systeme (3020), HAR 2026-10-14. */
const notebooks = parseSearchResult(fixture["3751"], categoryId("3751")).catalog;
const pcs = parseSearchResult(fixture["3020"], categoryId("3020")).catalog;

/** Test double for the benchmark port; scores are illustrative, not PassMark data. */
const SCORES: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  "AMD Ryzen 5 5500": { cpu_mark: 19_500, cpu_single: 3_050 },
  "AMD Ryzen 5 5600": { cpu_mark: 21_500, cpu_single: 3_250 },
  "AMD Ryzen 5 5600G": { cpu_mark: 19_900, cpu_single: 3_250 },
  "AMD Ryzen 5 5600X": { cpu_mark: 22_000, cpu_single: 3_350 },
};
const scorer: ModelScorer = (_facet, label) => SCORES[label] ?? null;

const facetPlan = (facets: readonly FacetPlan[], facet: FacetPlan["facet"]): FacetPlan => {
  const plan = facets.find((f) => f.facet === facet);
  if (plan === undefined) throw new Error(`no plan for ${facet}`);
  return plan;
};
const labels = (plan: FacetPlan) => plan.selected.map((o) => o.label);

describe("planRequirements", () => {
  it("selects every RAM option that guarantees the minimum", () => {
    const plan = planRequirements(
      { numeric: { ram_gb: { min: 32 } } },
      notebooks,
      emptyQuery(notebooks.categoryId),
      scorer,
    );
    const ram = facetPlan(plan.facets, "ram_gb");
    expect(ram.status).toBe("applied");
    expect(labels(ram)).toEqual(["32 GB", "36 GB", "40 GB", "48 GB", "64 GB", "96 GB", "128 GB"]);
    expect(plan.query.filterIds).toEqual(ram.selected.map((o) => o.filterId));
    expect(plan.hitsUpperBound).toBe(10_647 + 1 + 43 + 65 + 693 + 100 + 589);
  });

  it("selects CPUs by benchmark minimums, all or any", () => {
    const req = (combine: "all" | "any") => ({
      models: { cpu_model: { minimums: { cpu_mark: 20_000, cpu_single: 3_200 }, combine } },
    });
    const all = planRequirements(req("all"), pcs, emptyQuery(pcs.categoryId), scorer);
    expect(labels(facetPlan(all.facets, "cpu_model"))).toEqual([
      "AMD Ryzen 5 5600",
      "AMD Ryzen 5 5600X",
    ]);
    const any = planRequirements(req("any"), pcs, emptyQuery(pcs.categoryId), scorer);
    expect(labels(facetPlan(any.facets, "cpu_model"))).toEqual([
      "AMD Ryzen 5 5600",
      "AMD Ryzen 5 5600G",
      "AMD Ryzen 5 5600X",
    ]);
    const single = planRequirements(
      { models: { cpu_model: { minimums: { cpu_single: 3_100 } } } },
      pcs,
      emptyQuery(pcs.categoryId),
      scorer,
    );
    expect(labels(facetPlan(single.facets, "cpu_model"))).toEqual([
      "AMD Ryzen 5 5600",
      "AMD Ryzen 5 5600G",
      "AMD Ryzen 5 5600X",
    ]);
  });

  it("reports labels the scorer cannot resolve", () => {
    const plan = planRequirements(
      { models: { cpu_model: { minimums: { cpu_mark: 1 } } } },
      pcs,
      emptyQuery(pcs.categoryId),
      scorer,
    );
    expect(facetPlan(plan.facets, "cpu_model").unmatched).toEqual(["AMD Ryzen 5 7500F"]);
  });

  it("selects RAM types where the category has the group and says where it has none", () => {
    const pc = planRequirements(
      { labels: { ram_type: ["ddr5", "LPDDR5X"] } },
      pcs,
      emptyQuery(pcs.categoryId),
      scorer,
    );
    const ramType = facetPlan(pc.facets, "ram_type");
    expect([ramType.status, labels(ramType), ramType.unknownLabels]).toEqual([
      "applied",
      ["DDR5"],
      ["LPDDR5X"],
    ]);
    const nb = planRequirements(
      { labels: { ram_type: ["DDR5"] } },
      notebooks,
      emptyQuery(notebooks.categoryId),
      scorer,
    );
    expect(facetPlan(nb.facets, "ram_type")).toMatchObject({
      status: "not_expressible",
      reason: "no_group",
    });
    expect(nb.query.filterIds).toEqual([]);
  });

  it("uses the one storage group that meets the minimum when storage is split by unit", () => {
    const plan = planRequirements(
      { numeric: { storage_gb: { min: 2000 } } },
      pcs,
      emptyQuery(pcs.categoryId),
      scorer,
    );
    const storage = facetPlan(plan.facets, "storage_gb");
    expect([storage.status, storage.attributeId, labels(storage)]).toEqual([
      "applied",
      "30148",
      ["2 TB", "4 TB", "5 TB", "6 TB", "8 TB"],
    ]);
  });

  it("reports buckets that meet a bound only in part", () => {
    const plan = planRequirements(
      { numeric: { battery_h: { min: 9 } } },
      notebooks,
      emptyQuery(notebooks.categoryId),
      scorer,
    );
    const battery = facetPlan(plan.facets, "battery_h");
    expect(labels(battery)).toEqual(["10 bis 12 h", "12 bis 14 h", "ab 14 h"]);
    expect(battery.partial.map((o) => o.label)).toEqual(["8 bis 10 h"]);
  });

  it("flags unsatisfiable and unconstrained requirements without adding filters", () => {
    const plan = planRequirements(
      { numeric: { ram_gb: { min: 512 }, release_year: { min: 2000 } } },
      notebooks,
      emptyQuery(notebooks.categoryId),
      scorer,
    );
    expect(facetPlan(plan.facets, "ram_gb").status).toBe("unsatisfiable");
    expect(facetPlan(plan.facets, "release_year").status).toBe("unconstrained");
    expect(plan.query.filterIds).toEqual([]);
  });

  it("replaces planned groups' filters in the base query, keeps others, sets price", () => {
    const base = {
      ...emptyQuery(notebooks.categoryId),
      filterIds: [filterId("7612871"), filterId("1466479")], // 8 GB RAM, Gaming Notebook
    };
    const plan = planRequirements(
      { numeric: { ram_gb: { min: 96 } }, price: { min: 800, max: 1500 } },
      notebooks,
      base,
      scorer,
    );
    expect(plan.query.filterIds).toEqual(["1466479", "104371837", "101486655"]);
    expect(plan.query.price).toEqual({ min: 800, max: 1500 });
  });

  it("rejects a catalog of another category", () => {
    expect(() => planRequirements({}, notebooks, emptyQuery(pcs.categoryId), scorer)).toThrow(
      /does not match/,
    );
  });
});
