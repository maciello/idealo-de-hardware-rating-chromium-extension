import { describe, expect, it } from "vitest";
import {
  addFilters,
  addManufacturers,
  categoryId,
  clearGroup,
  describeQuery,
  emptyQuery,
  filterId,
  type IdealoQuery,
  indexCatalog,
  manufacturerId,
  removeFilters,
  removeManufacturers,
  resetPaging,
  setOffset,
  setPrice,
  setSort,
  setText,
  toggleFilter,
} from "../src/index";
import { CATEGORY, catalog } from "./fixtures";

const f = filterId;
const start: IdealoQuery = { ...emptyQuery(CATEGORY), filterIds: [f("1147301")], offset: 48 };

describe("selection ops", () => {
  it("any filter change resets paging", () => {
    expect(addFilters(start, [f("1263422")])).toEqual({
      ...emptyQuery(CATEGORY),
      filterIds: [f("1147301"), f("1263422")],
    });
    expect(removeFilters(start, [f("1147301")]).offset).toBeUndefined();
    expect(toggleFilter(start, f("9")).offset).toBeUndefined();
    expect(setPrice(start, { min: 1 }).offset).toBeUndefined();
    expect(setSort(start, "minPrice").offset).toBeUndefined();
    expect(setText(start, "x").offset).toBeUndefined();
    expect(addManufacturers(start, [manufacturerId("77")]).offset).toBeUndefined();
    expect(resetPaging(start).offset).toBeUndefined();
  });

  it("no-op changes keep paging", () => {
    expect(addFilters(start, [f("1147301")])).toEqual(start);
    expect(removeFilters(start, [f("5")])).toEqual(start);
    expect(removeManufacturers(start, [manufacturerId("5")])).toEqual(start);
  });

  it("does not mutate its input", () => {
    const frozen = Object.freeze({
      ...start,
      filterIds: Object.freeze([...start.filterIds]) as never,
    });
    expect(() => addFilters(frozen, [f("2")])).not.toThrow();
    expect(start.filterIds).toEqual([f("1147301")]);
  });

  it("keeps order of existing ids and appends new ones", () => {
    const q = addFilters(emptyQuery(CATEGORY), [f("3"), f("1"), f("3"), f("2")]);
    expect(q.filterIds).toEqual([f("3"), f("1"), f("2")]);
  });

  it("clears only the filters of one catalog group", () => {
    const q = addFilters(emptyQuery(CATEGORY), [
      f("1147301"),
      f("101483660"),
      f("1263422"),
      f("999"),
    ]);
    expect(clearGroup(q, catalog, "5011").filterIds).toEqual([f("101483660"), f("999")]);
    expect(clearGroup(q, catalog, "nope")).toEqual(q);
    expect(clearGroup(q, { ...catalog, categoryId: categoryId("1") }, "5011")).toEqual(q);
  });

  it("setPrice with undefined or empty range removes the price", () => {
    const priced = setPrice(start, { min: 5, max: 10 });
    expect(setPrice(priced, undefined).price).toBeUndefined();
    expect(setPrice(priced, {}).price).toBeUndefined();
    expect(setPrice(start, { min: 10, max: 5 }).price).toEqual({ min: 5, max: 10 });
  });

  it("setOffset clamps and truncates", () => {
    expect(setOffset(start, 17.9).offset).toBe(17);
    expect(setOffset(start, -4).offset).toBeUndefined();
  });
});

describe("indexCatalog", () => {
  it("looks up filters, groups and manufacturers", () => {
    const index = indexCatalog(catalog);
    expect(index.filter(f("1263422"))?.group.name).toBe("Prozessor");
    expect(index.filter(f("1263422"))?.filter.label).toBe("AMD Ryzen 7");
    expect(index.filter(f("1"))).toBeUndefined();
    expect(index.group("6022")?.name).toBe("Arbeitsspeicher");
    expect(index.manufacturer(manufacturerId("88"))?.name).toBe("ASUS");
    expect(index.manufacturerBySearchFilterId(f("5550077"))?.name).toBe("Lenovo");
    expect(indexCatalog(catalog)).toBe(index);
  });
});

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
    expect(d.summary).toBe(
      [
        "Category 16073",
        "Prozessor: Intel Core i7",
        "Arbeitsspeicher: 16 GB",
        "Manufacturer: Lenovo, ASUS",
        "Unknown filter ids: 424242",
        "Unknown manufacturer ids: 99",
        "Price: 100-900 EUR",
        "Sort: minPrice",
        "Search text: oled",
        "Result offset: 16",
      ].join("\n"),
    );
  });

  it("treats everything as unknown for a catalog of another category", () => {
    const q = addFilters(emptyQuery(categoryId("1")), [f("1147301")]);
    const d = describeQuery(q, catalog);
    expect(d.groups).toEqual([]);
    expect(d.unknownFilterIds).toEqual([f("1147301")]);
  });
});
