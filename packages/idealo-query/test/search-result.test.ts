import { describe, expect, it } from "vitest";
import {
  categoryId,
  filterId,
  indexCatalog,
  parseSearchResult,
  readEmbeddedSearchResult,
} from "../src/index";
import miniPcFixture from "./fixtures/embedded-search-result.minipc.trimmed.json" with {
  type: "json",
};
import fixture from "./fixtures/search-result.trimmed.json" with { type: "json" };

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

/** Inline script as served on a listing page (shape from 5 HAR documents, 2026-10-14). */
const inlineScript = (payload: unknown, category = "3020"): string => {
  const base64 = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(payload))));
  return [
    "window.csr = window.csr || {};",
    "window.csr.initialData = window.csr.initialData || {};",
    `window.csr.initialData['categoryId'] = "${category}";`,
    `window.csr.initialData['searchResultId'] = "03b5f915";`,
    `window.csr.initialData['searchResult'] = "${base64}";`,
  ].join("");
};

describe("readEmbeddedSearchResult", () => {
  /** Trimmed from the page-0 payload of Mini-PC (ProductCategory/3020F720310.html). */
  const embedded = readEmbeddedSearchResult(inlineScript(miniPcFixture));

  it("decodes the base64 payload (UTF-8) and the category id", () => {
    expect(embedded?.categoryId).toBe("3020");
    const page = parseSearchResult(embedded?.json, categoryId("3020"));
    expect(page.items.map((item) => item.title)).toEqual([
      "GMKtec EVO-X2 (Ryzen AI Max+ 395 / 64GB / 1TB)",
      "Beelink SER8",
      "Apple Mac Studio M5 2026",
    ]);
    expect(page.catalog.groups.map((g) => g.name)).toEqual(["PC-Typ", "Grafikkarte", "CPU-Typ"]);
    expect(page.catalog.groups[0]?.filters[1]).toEqual({
      filterId: "4487778",
      label: "Aufrüstkit",
      count: 207,
    });
  });

  it("reports the active filters", () => {
    expect(parseSearchResult(embedded?.json, categoryId("3020")).selected).toEqual(["720310"]);
    expect(parseSearchResult(json, NOTEBOOKS).selected).toEqual([]);
  });

  it("keeps tiles whose spec line names no CPU (title and Jev must cover them)", () => {
    const page = parseSearchResult(embedded?.json, categoryId("3020"));
    expect(page.items[1]?.characteristics).toEqual([
      "Mini-PC",
      "3,8 GHz",
      "8-Core",
      "DDR5",
      "AMD Radeon 780M",
    ]);
  });

  it("returns null for pages without the payload", () => {
    expect(readEmbeddedSearchResult("window.csr = window.csr || {};")).toBeNull();
  });
});
