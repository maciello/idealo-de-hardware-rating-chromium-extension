import { describe, expect, it } from "vitest";
import {
  addFilters,
  categoryId,
  describeQuery,
  emptyQuery,
  filterId,
  type IdealoQuery,
  manufacturerId,
} from "../../src/index";
import { CATEGORY, catalog } from "../fixtures";

const f = filterId;

describe("describeQuery", () => {
  it("groups by catalog group and reports unknown ids", () => {
    const q: IdealoQuery = {
      ...emptyQuery(CATEGORY),
      filterIds: [f("101483660"), f("1147301"), f("424242"), f("5550077")],
      manufacturerIds: [manufacturerId("88"), manufacturerId("99")],
      price: { min: 100, max: 900 },
      sort: "minPrice",
      text: "oled",
      offset: 16,
    };
    const d = describeQuery(q, catalog);
    expect(d.groups.map((g) => g.name)).toEqual(["Prozessor", "Arbeitsspeicher"]);
    expect(d.manufacturers.map((m) => m.name)).toEqual(["Lenovo", "ASUS"]);
    expect(d.unknownFilterIds).toEqual([f("424242")]);
    expect(d.unknownManufacturerIds).toEqual([manufacturerId("99")]);
    expect(d.categoryId).toBe("16073");
    expect(d.groups.map((g) => g.filters.map((filter) => filter.label))).toEqual([
      ["Intel Core i7"],
      ["16 GB"],
    ]);
    expect(d).toMatchObject({
      price: { min: 100, max: 900 },
      sort: "minPrice",
      text: "oled",
      offset: 16,
    });
  });

  it("treats everything as unknown for a catalog of another category", () => {
    const q = addFilters(emptyQuery(categoryId("1")), [f("1147301")]);
    const d = describeQuery(q, catalog);
    expect(d.groups).toEqual([]);
    expect(d.unknownFilterIds).toEqual([f("1147301")]);
  });
});
