import { describe, expect, it } from "vitest";
import { filterId, type IdealoQuery, manufacturerId, toMcpSearchArgs } from "../../../src/index";
import { CATEGORY } from "../../fixtures";

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
