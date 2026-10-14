import { describe, expect, it } from "vitest";
import {
  categoryId,
  filterId,
  type IdealoQuery,
  manufacturerId,
  parseIdealoUrl,
  toWebUrl,
  UnrepresentableQueryError,
} from "../src/index";
import { CATEGORY, catalog } from "./fixtures";

const BASE = "https://www.idealo.de/preisvergleich";
const ids = (...v: string[]) => v.map(filterId);

function category(url: string) {
  const parsed = parseIdealoUrl(url);
  if (parsed.kind !== "category") throw new Error(`expected category, got ${parsed.kind}`);
  return parsed;
}

describe("parseIdealoUrl categories", () => {
  it("parses several F-ids and sortKey", () => {
    const url = `${BASE}/ProductCategory/16073F1147301-1263422-101483660.html?sortKey=minPrice`;
    expect(category(url).query).toEqual({
      categoryId: CATEGORY,
      filterIds: ids("1147301", "1263422", "101483660"),
      manufacturerIds: [],
      sort: "minPrice",
    });
  });

  it("preserves the opaque suffix and does not read its digits as ids", () => {
    const url = `${BASE}/ProductCategory/16073F1309393-100611441oE0oJ1.html?p=0.0-1000.0&sortKey=minPrice`;
    const { query } = category(url);
    expect(query.filterIds).toEqual(ids("1309393", "100611441"));
    expect(query.opaqueSuffix).toBe("oE0oJ1");
    expect(query.price).toEqual({ max: 1000 });
    expect(toWebUrl(query)).toBe(url);
  });

  it("parses the second suffix example", () => {
    const url = `${BASE}/ProductCategory/16073F1309393-1335211oE0oJ1.html`;
    const { query } = category(url);
    expect(query.filterIds).toEqual(ids("1309393", "1335211"));
    expect(query.opaqueSuffix).toBe("oE0oJ1");
    expect(toWebUrl(query)).toBe(url);
  });

  it("parses a single filter", () => {
    expect(category(`${BASE}/ProductCategory/3132F1125401.html`).query).toEqual({
      categoryId: categoryId("3132"),
      filterIds: ids("1125401"),
      manufacturerIds: [],
    });
  });

  it("parses a bare category", () => {
    expect(category(`${BASE}/ProductCategory/3751.html`).query).toEqual({
      categoryId: categoryId("3751"),
      filterIds: [],
      manufacturerIds: [],
    });
  });

  it("parses paging", () => {
    const url = `${BASE}/ProductCategory/3513I16-705.html`;
    const { query } = category(url);
    expect(query).toEqual({
      categoryId: categoryId("3513"),
      filterIds: [],
      manufacturerIds: [],
      offset: 705,
    });
    expect(toWebUrl(query)).toBe(url);
  });

  it("parses filters combined with paging and suffix", () => {
    const url = `${BASE}/ProductCategory/3513F11-22I16-705oE0.html`;
    const { query } = category(url);
    expect(query).toMatchObject({ filterIds: ids("11", "22"), offset: 705, opaqueSuffix: "oE0" });
    expect(toWebUrl(query)).toBe(url);
  });

  it("drops msockid and reports it", () => {
    const parsed = category(`${BASE}/ProductCategory/12292F2121990.html?msockid=abc`);
    expect(parsed.query.filterIds).toEqual(ids("2121990"));
    expect(parsed.ignoredParams).toEqual(["msockid"]);
    expect(toWebUrl(parsed.query)).toBe(`${BASE}/ProductCategory/12292F2121990.html`);
  });

  it("reads free text and ignores qd", () => {
    const parsed = category(`${BASE}/ProductCategory/3751.html?q=rtx%204070&qd=x`);
    expect(parsed.query.text).toBe("rtx 4070");
    expect(parsed.ignoredParams).toEqual(["qd"]);
  });

  it("reads open-ended and malformed prices", () => {
    expect(category(`${BASE}/ProductCategory/3751.html?p=500.0-`).query.price).toEqual({
      min: 500,
    });
    expect(category(`${BASE}/ProductCategory/3751.html?p=-99.5`).query.price).toEqual({
      max: 99.5,
    });
    const bad = category(`${BASE}/ProductCategory/3751.html?p=abc`);
    expect(bad.query.price).toBeUndefined();
    expect(bad.ignoredParams).toEqual(["p"]);
  });

  it("accepts URL objects and relative URLs", () => {
    const path = "/preisvergleich/ProductCategory/3751.html";
    expect(parseIdealoUrl(new URL(`https://www.idealo.de${path}`)).kind).toBe("category");
    expect(parseIdealoUrl(path).kind).toBe("category");
  });
});

describe("parseIdealoUrl other kinds", () => {
  it("parses a search URL", () => {
    expect(parseIdealoUrl(`${BASE}/MainSearchProductCategory.html?q=rtx%204070`)).toEqual({
      kind: "search",
      text: "rtx 4070",
      ignoredParams: [],
    });
  });

  it("parses a product URL with slug", () => {
    expect(parseIdealoUrl(`${BASE}/OffersOfProduct/201234567_-macbook-air-13-apple.html`)).toEqual({
      kind: "product",
      productId: "201234567",
      slug: "-macbook-air-13-apple",
    });
  });

  it("parses a product URL without slug", () => {
    expect(parseIdealoUrl(`${BASE}/OffersOfProduct/42.html`)).toEqual({
      kind: "product",
      productId: "42",
    });
  });

  it.each([
    "not a url at all",
    "https://example.com/preisvergleich/ProductCategory/3751.html",
    `${BASE}/Something/3751.html`,
    `${BASE}/ProductCategory/abc.html`,
    `${BASE}/ProductCategory/3751-5.html`,
    `${BASE}/MainSearchProductCategory.html`,
  ])("returns unknown for %s", (url) => {
    expect(parseIdealoUrl(url)).toEqual({ kind: "unknown" });
  });
});

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
