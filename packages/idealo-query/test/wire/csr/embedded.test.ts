import { describe, expect, it } from "vitest";
import { categoryId, parseSearchResult, readEmbeddedSearchResult } from "../../../src/index";
import miniPcFixture from "../../fixtures/embedded-search-result.minipc.trimmed.json" with {
  type: "json",
};
import fixture from "../../fixtures/search-result.trimmed.json" with { type: "json" };

const json: unknown = fixture;
const NOTEBOOKS = categoryId("3751");

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
