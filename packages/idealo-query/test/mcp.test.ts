import { describe, expect, it } from "vitest";
import {
  filterId,
  type IdealoQuery,
  manufacturerId,
  parseMcpSearchResponseCatalog,
  toMcpSearchArgs,
} from "../src/index";
import { CATEGORY, catalog, MCP_RESPONSE } from "./fixtures";

describe("parseMcpSearchResponseCatalog", () => {
  it("maps the MCP shape and coerces numeric ids", () => {
    expect(catalog).toEqual({
      categoryId: CATEGORY,
      groups: [
        {
          attributeId: "5011",
          name: "Prozessor",
          filters: [
            { filterId: "1147301", label: "Intel Core i7", count: 120 },
            { filterId: "1263422", label: "AMD Ryzen 7", count: 80 },
          ],
        },
        {
          attributeId: "6022",
          name: "Arbeitsspeicher",
          filters: [
            { filterId: "101483660", label: "16 GB", count: 200 },
            { filterId: "1309393", label: "32 GB" },
          ],
        },
      ],
      manufacturers: [
        { manufacturerId: "77", name: "Lenovo", count: 40, searchFilterId: "5550077" },
        { manufacturerId: "88", name: "ASUS", count: 31 },
      ],
    });
  });

  it("accepts a response with only one of the lists", () => {
    const only = parseMcpSearchResponseCatalog({ availableManufacturers: [] }, CATEGORY);
    expect(only.groups).toEqual([]);
  });

  it.each([
    ["wrong shape", { availableFilters: "nope" }],
    ["neither list", { products: [] }],
    [
      "non-numeric id",
      {
        availableFilters: [
          { attributeId: "1", name: "x", filters: [{ filterId: "abc", content: "y" }] },
        ],
      },
    ],
    ["not an object", null],
  ])("rejects %s", (_name, json) => {
    expect(() => parseMcpSearchResponseCatalog(json, CATEGORY)).toThrow();
  });

  it("does not mutate its input", () => {
    const copy = structuredClone(MCP_RESPONSE);
    parseMcpSearchResponseCatalog(copy, CATEGORY);
    expect(copy).toEqual(MCP_RESPONSE);
  });
});

describe("toMcpSearchArgs", () => {
  const query: IdealoQuery = {
    categoryId: CATEGORY,
    filterIds: [filterId("1147301"), filterId("101483660")],
    manufacturerIds: [manufacturerId("77")],
    price: { min: 199.5, max: 999.1 },
    sort: "minPrice",
    offset: 32,
    opaqueSuffix: "oE0",
  };

  it("maps the full query", () => {
    expect(toMcpSearchArgs(query, { fallbackQuery: "laptop" })).toEqual({
      query: "laptop",
      country: "DE",
      filters: {
        minPrice: 199,
        maxPrice: 1000,
        includeCategories: ["16073"],
        includeManufacturers: ["77"],
        includeSearchFilters: ["1147301", "101483660"],
      },
    });
  });

  it("prefers query text and honours country", () => {
    expect(
      toMcpSearchArgs({ ...query, text: " rtx 4070 " }, { fallbackQuery: "laptop", country: "AT" }),
    ).toMatchObject({ query: "rtx 4070", country: "AT" });
  });

  it("omits empty parts", () => {
    expect(
      toMcpSearchArgs(
        { categoryId: CATEGORY, filterIds: [], manufacturerIds: [] },
        { fallbackQuery: "x" },
      ),
    ).toEqual({ query: "x", country: "DE", filters: { includeCategories: ["16073"] } });
  });

  it("requires some query text", () => {
    expect(() =>
      toMcpSearchArgs(
        { categoryId: CATEGORY, filterIds: [], manufacturerIds: [] },
        { fallbackQuery: "  " },
      ),
    ).toThrow();
  });
});
