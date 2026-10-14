import {
  categoryId,
  filterId,
  manufacturerId,
  type QueryDescription,
} from "@idealo-hw/idealo-query";
import { describe, expect, it } from "vitest";
import { summaryOf } from "../../../../src/features/filters/view-model/summary";

const BARE: QueryDescription = {
  categoryId: "16073",
  groups: [],
  manufacturers: [],
  unknownFilterIds: [],
  unknownManufacturerIds: [],
  price: undefined,
  sort: undefined,
  text: undefined,
  offset: undefined,
};

describe("summaryOf", () => {
  it("names every part of a full query on its own line", () => {
    const full: QueryDescription = {
      ...BARE,
      categoryId: categoryId("16073"),
      groups: [
        {
          attributeId: "cpu",
          name: "Prozessor",
          filters: [{ filterId: filterId("101483660"), label: "Intel Core i7" }],
        },
        {
          attributeId: "ram",
          name: "Arbeitsspeicher",
          filters: [{ filterId: filterId("1147301"), label: "16 GB" }],
        },
      ],
      manufacturers: [
        { manufacturerId: manufacturerId("88"), name: "Lenovo" },
        { manufacturerId: manufacturerId("77"), name: "ASUS" },
      ],
      unknownFilterIds: [filterId("424242")],
      unknownManufacturerIds: [manufacturerId("99")],
      price: { min: 100, max: 900 },
      sort: "minPrice",
      text: "oled",
      offset: 16,
    };
    expect(summaryOf(full)).toBe(
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

  it("lists the filters of a group with a comma and leaves out what is not set", () => {
    const description: QueryDescription = {
      ...BARE,
      groups: [
        {
          attributeId: "ram",
          name: "Arbeitsspeicher",
          filters: [
            { filterId: filterId("1"), label: "16 GB" },
            { filterId: filterId("2"), label: "32 GB" },
          ],
        },
      ],
      offset: 0,
    };
    expect(summaryOf(description)).toBe("Category 16073\nArbeitsspeicher: 16 GB, 32 GB");
    expect(summaryOf(BARE)).toBe("Category 16073");
  });

  it.each([
    [{ min: 100 }, "Price: from 100 EUR"],
    [{ max: 900 }, "Price: up to 900 EUR"],
    [{ min: 100, max: 900 }, "Price: 100-900 EUR"],
  ])("writes the price range %j", (price, line) => {
    expect(summaryOf({ ...BARE, price })).toBe(`Category 16073\n${line}`);
  });
});
