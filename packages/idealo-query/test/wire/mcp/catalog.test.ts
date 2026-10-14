import { describe, expect, it } from "vitest";
import { parseMcpSearchResponseCatalog } from "../../../src/index";
import { CATEGORY, catalog, MCP_RESPONSE } from "../../fixtures";

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
