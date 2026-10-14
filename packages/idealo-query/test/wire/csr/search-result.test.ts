import { describe, expect, it } from "vitest";
import { categoryId, filterId, indexCatalog, parseSearchResult } from "../../../src/index";
import groupsFixture from "../../fixtures/catalog-groups.3751-3020.json" with { type: "json" };
import fixture from "../../fixtures/search-result.trimmed.json" with { type: "json" };

/** Trimmed from a real response (HAR 2026-10-14, Notebooks, query "laptop 32GB", pageIndex 2). */
const json: unknown = fixture;
const NOTEBOOKS = categoryId("3751");

describe("parseSearchResult", () => {
  const page = parseSearchResult(json, NOTEBOOKS);

  it("reads product tiles with their spec fragments, NBSP normalised", () => {
    expect(page.items[0]).toEqual({
      kind: "product",
      id: "211498803",
      title:
        'Dell Pro 16 PC16250 16" Intel Core Ultra 7 255U, 32GB, 1TB SSD, Windows 11 Pro (GK9T1)',
      characteristics: [
        "Multimedia Notebook",
        "16 Zoll",
        "Full HD",
        "Intel Core Ultra 7 255U",
        "32 GB RAM",
        "1.000 GB SSD-Speicher",
        "Intel Graphics",
        "Windows 11 Professional",
      ],
      priceEur: 2108.99,
      offerCount: 1,
      usedOnly: false,
      url: "https://www.idealo.de/preisvergleich/OffersOfProduct/211498803_-pro-16-pc16250-16-intel-core-ultra-7-255u-32gb-1tb-ssd-windows-11-pro-gk9t1-dell.html",
    });
  });

  it("keeps single offers but without a product URL", () => {
    const offer = page.items.find((item) => item.kind === "offer");
    expect(offer).toMatchObject({ characteristics: [], url: null, priceEur: 1706.63 });
  });

  it("turns filterGroups into a FilterCatalog with ids and hit counts", () => {
    expect(page.catalog.groups.map((g) => [g.attributeId, g.name])).toEqual([
      ["1006", "Prozessor"],
      ["14670", "Grafikkarte"],
      ["manufacturer", "Hersteller"],
    ]);
    const lookup = indexCatalog(page.catalog).filter(filterId("107301240"));
    expect(lookup?.group.name).toBe("Prozessor");
    expect(lookup?.filter).toEqual({ filterId: "107301240", label: "AMD Ryzen 5 150", count: 75 });
    expect(page.resultCount).toBe(53_609);
  });

  it("rejects a payload without items", () => {
    expect(() => parseSearchResult({ filterGroups: [] }, NOTEBOOKS)).toThrow();
  });
});

describe("parseSearchResult price bounds", () => {
  /** Real filter groups (labels, ids, hits) of Notebooks (3751), HAR 2026-10-14. */
  const notebooks = parseSearchResult(groupsFixture["3751"], categoryId("3751"));

  it("reads the result set's price span", () => {
    expect(notebooks.priceBounds).toEqual({ min: 26, max: 11_917 });
  });
});
