import { describe, expect, it } from "vitest";
import {
  filterId,
  type IdealoQuery,
  manufacturerId,
  toSearchUrl,
  toWebUrl,
  UnrepresentableQueryError,
} from "../../src/index";
import { CATEGORY, catalog } from "../fixtures";

const BASE = "https://www.idealo.de/preisvergleich";
const ids = (...v: string[]) => v.map(filterId);

describe("toWebUrl", () => {
  const base: IdealoQuery = { categoryId: CATEGORY, filterIds: [], manufacturerIds: [] };

  it("formats prices canonically", () => {
    expect(toWebUrl({ ...base, price: { min: 0, max: 1000 } })).toBe(
      `${BASE}/ProductCategory/16073.html?p=0.0-1000.0`,
    );
    expect(toWebUrl({ ...base, price: { min: 12.345, max: 99.5 } })).toBe(
      `${BASE}/ProductCategory/16073.html?p=12.35-99.5`,
    );
    expect(toWebUrl({ ...base, price: { max: 20 } })).toBe(
      `${BASE}/ProductCategory/16073.html?p=0.0-20.0`,
    );
    expect(toWebUrl({ ...base, price: { min: 500 } })).toBe(
      `${BASE}/ProductCategory/16073.html?p=500.0-`,
    );
  });

  it("encodes text and honours origin", () => {
    expect(toWebUrl({ ...base, text: "a&b c+d" }, { origin: "https://idealo.test/" })).toBe(
      "https://idealo.test/preisvergleich/ProductCategory/16073.html?q=a%26b%20c%2Bd",
    );
  });

  it("deduplicates ids", () => {
    expect(toWebUrl({ ...base, filterIds: ids("1", "2", "1") })).toBe(
      `${BASE}/ProductCategory/16073F1-2.html`,
    );
  });

  it("folds mapped manufacturers into F-ids via the catalog", () => {
    const query = { ...base, filterIds: ids("1147301"), manufacturerIds: [manufacturerId("77")] };
    expect(toWebUrl(query, { catalog })).toBe(`${BASE}/ProductCategory/16073F1147301-5550077.html`);
  });

  it("refuses manufacturers it cannot express", () => {
    const query = { ...base, manufacturerIds: [manufacturerId("88")] };
    expect(() => toWebUrl(query)).toThrow(UnrepresentableQueryError);
    expect(() => toWebUrl(query, { catalog })).toThrow(UnrepresentableQueryError);
  });
});

describe("toSearchUrl", () => {
  const base: IdealoQuery = { categoryId: CATEGORY, filterIds: [], manufacturerIds: [] };

  it("keeps text, price and sort and drops filters and category", () => {
    const query: IdealoQuery = {
      ...base,
      filterIds: ids("1"),
      text: "laptop 32GB",
      price: { min: 500 },
      sort: "price",
    };
    expect(toSearchUrl(query)).toBe(
      "https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?p=500.0-&q=laptop%2032GB&sortKey=price",
    );
  });

  it("writes the bare search page for a query without text, price and sort", () => {
    expect(toSearchUrl(base)).toBe(
      "https://www.idealo.de/preisvergleich/MainSearchProductCategory.html",
    );
  });
});
