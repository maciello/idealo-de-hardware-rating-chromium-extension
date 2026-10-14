import { describe, expect, it } from "vitest";
import { measureOf } from "../../../src/index";

describe("measureOf", () => {
  it.each([
    ["RAM", "16 GB", "ram_gb", 16],
    ["SSD-Speicher", "1.000 GB", "ssd_gb", 1000],
    ["SSD-Speicher", "2 TB", "ssd_gb", 2000],
    ["Interner Speicher", "128 GB", "storage_gb", 128],
    ["Helligkeit", "300 cd/m²", "brightness_nits", 300],
    ["Markteinführung", "2025", "release_year", 2025],
    ["Gewicht", "1,4 kg", "weight_kg", 1.4],
  ] as const)("reads %s %s", (group, value, facet, expected) => {
    expect(measureOf(group, value)).toEqual({ facet, value: expected });
  });

  it("matches the group name like the filter catalog does", () => {
    expect(measureOf("  ssd-speicher ", "512 GB")).toEqual({ facet: "ssd_gb", value: 512 });
  });

  it.each([
    ["Unbekannt", "16 GB"],
    ["Prozessor", "Intel Core i5"],
    ["RAM Typ", "DDR4"],
    ["RAM", "16 Zoll"],
    ["RAM", "bis 8 GB"],
    ["RAM", "8 bis 16 GB"],
    ["RAM", "ab 16 GB"],
    ["RAM", "viel"],
    ["RAM", ""],
  ])("gives null for %s %j", (group, value) => {
    expect(measureOf(group, value)).toBeNull();
  });
});
