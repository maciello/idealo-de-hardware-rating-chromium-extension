import { describe, expect, it } from "vitest";
import {
  categoryId,
  emptyQuery,
  type FacetPlan,
  type FilterCatalog,
  parseSearchResult,
  planRequirements,
} from "../../../src/index";
import fixture from "../../fixtures/catalog-groups.3751-3020.json" with { type: "json" };

const notebooks = parseSearchResult(fixture["3751"], categoryId("3751")).catalog;
const pcs = parseSearchResult(fixture["3020"], categoryId("3020")).catalog;

/**
 * Notebooks as idealo can list them: the dedicated-only memory group (31502) beside the one with a
 * "Shared Memory" option (15869, taken here from PC-Systeme).
 */
const shared = pcs.groups.find((g) => g.attributeId === "15869");
if (shared === undefined) throw new Error("fixture lost the shared-memory group");
const sharedFirst: FilterCatalog = { ...notebooks, groups: [shared, ...notebooks.groups] };
const dedicatedFirst: FilterCatalog = { ...notebooks, groups: [...notebooks.groups, shared] };

const plan = (catalog: FilterCatalog, min: number) =>
  planRequirements(
    { numeric: { vram_gb: { min } } },
    catalog,
    emptyQuery(catalog.categoryId),
    () => null,
  );

const vramOf = (catalog: FilterCatalog, min: number): FacetPlan => {
  const found = plan(catalog, min).facets.find((f) => f.facet === "vram_gb");
  if (found === undefined) throw new Error("no vram plan");
  return found;
};

describe("a facet listed twice under one name", () => {
  it.each([
    ["shared group first", sharedFirst],
    ["dedicated group first", dedicatedFirst],
  ])("selects the options of the group without Shared Memory, %s", (_name, catalog) => {
    const vram = vramOf(catalog, 8);
    expect(vram.status).toBe("applied");
    expect(vram.attributeId).toBe("31502");
    expect(vram.selected.map((o) => o.label)).toEqual(["8 GB", "12 GB", "16 GB", "24 GB"]);
  });

  it("never selects Shared Memory and keeps the url to one group's ids", () => {
    const query = plan(sharedFirst, 1).query;
    const sharedIds = new Set(shared.filters.map((f) => f.filterId));
    expect(query.filterIds.length).toBeGreaterThan(0);
    expect(query.filterIds.some((id) => sharedIds.has(id))).toBe(false);
  });

  it("replaces the ids of both groups already in the url", () => {
    const stale = shared.filters.slice(0, 2).map((f) => f.filterId);
    const { query } = planRequirements(
      { numeric: { vram_gb: { min: 16 } } },
      sharedFirst,
      { ...emptyQuery(sharedFirst.categoryId), filterIds: stale },
      () => null,
    );
    expect(query.filterIds.some((id) => stale.includes(id))).toBe(false);
  });

  it("is unsatisfiable when neither group has a large enough option", () => {
    expect(vramOf(sharedFirst, 64).status).toBe("unsatisfiable");
  });
});

describe("a facet split by unit", () => {
  it("stays not expressible when the GB and TB groups both meet the minimum", () => {
    const { facets } = planRequirements(
      { numeric: { storage_gb: { min: 500 } } },
      pcs,
      emptyQuery(pcs.categoryId),
      () => null,
    );
    expect(facets.find((f) => f.facet === "storage_gb")).toMatchObject({
      status: "not_expressible",
      reason: "split_across_groups",
    });
  });
});
