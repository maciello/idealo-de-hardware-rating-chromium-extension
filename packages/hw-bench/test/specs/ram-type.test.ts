import { describe, expect, it } from "vitest";
import { compareRamLabels, KNOWN_RAM_TYPES, parseRamLabel, ramTypeOf } from "../../src";

describe("ramTypeOf", () => {
  it("reads the standalone fragment of a tile and flags DDR4 and older", () => {
    expect(ramTypeOf("Business Notebook, 14 Zoll, Intel Core i5-10210U, 32 GB RAM, DDR4")).toEqual({
      label: "DDR4",
      outdated: true,
    });
    expect(ramTypeOf("Notebook, DDR3, 8 GB RAM")).toEqual({ label: "DDR3", outdated: true });
    expect(ramTypeOf("Notebook, LPDDR4X, 16 GB RAM")).toEqual({ label: "LPDDR4X", outdated: true });
  });

  it("treats DDR5 and LPDDR5(X) as the baseline", () => {
    expect(ramTypeOf("Notebook, DDR5")).toEqual({ label: "DDR5", outdated: false });
    expect(ramTypeOf("Notebook, LPDDR5")).toEqual({ label: "LPDDR5", outdated: false });
    expect(ramTypeOf("Notebook, LPDDR5X")).toEqual({ label: "LPDDR5X", outdated: false });
  });

  it("does not count graphics memory", () => {
    expect(
      ramTypeOf("Gaming Notebook, NVIDIA GeForce RTX 5060, Grafikspeichertyp GDDR6"),
    ).toBeNull();
    expect(ramTypeOf("Grafikspeichertyp GDDR5, 32 GB RAM")).toBeNull();
  });

  it("keeps the system memory when graphics memory is listed beside it", () => {
    expect(ramTypeOf("Grafikspeichertyp GDDR6, DDR4, 16 GB RAM")).toEqual({
      label: "DDR4",
      outdated: true,
    });
  });

  it("reads the datasheet's RAM-type row", () => {
    expect(ramTypeOf("RAM\t32 GB\nRAM-Typ\tDDR4-3200 SDRAM\nGrafikspeichertyp\tGDDR6")).toEqual({
      label: "DDR4",
      outdated: true,
    });
    expect(ramTypeOf("RAM Typ\tLPDDR5X\nGrafikspeichertyp\tGDDR6")).toEqual({
      label: "LPDDR5X",
      outdated: false,
    });
  });

  it("says nothing when the type is unstated or contradictory", () => {
    expect(ramTypeOf("")).toBeNull();
    expect(ramTypeOf("Notebook, 32 GB RAM, 1.000 GB SSD-Speicher")).toBeNull();
    expect(ramTypeOf("Mainboard for DDR4 and DDR5")).toBeNull();
  });
});

describe("parseRamLabel", () => {
  it("reads generation, low power and outdated from a facet label", () => {
    expect(parseRamLabel("DDR4")).toEqual({
      kind: "known",
      label: "DDR4",
      generation: 4,
      lowPower: false,
      outdated: true,
    });
    expect(parseRamLabel("lpddr5x")).toEqual({
      kind: "known",
      label: "LPDDR5X",
      generation: 5,
      lowPower: true,
      outdated: false,
    });
  });

  it("maps labels outside the grammar to an explicit unknown", () => {
    expect(parseRamLabel("GDDR6")).toEqual({ kind: "unknown", label: "GDDR6" });
    expect(parseRamLabel("SDRAM")).toEqual({ kind: "unknown", label: "SDRAM" });
    expect(parseRamLabel("")).toEqual({ kind: "unknown", label: "" });
  });
});

describe("compareRamLabels", () => {
  it("sorts the newest generation first, plain before low-power, unknown last", () => {
    const sorted = ["DDR4", "SDRAM", "LPDDR5X", "DDR5", "LPDDR5", "DDR3"].sort(compareRamLabels);
    expect(sorted).toEqual(["DDR5", "LPDDR5", "LPDDR5X", "DDR4", "DDR3", "SDRAM"]);
  });

  it("orders the fallback list of known types by generation", () => {
    expect([...KNOWN_RAM_TYPES].sort(compareRamLabels)).toEqual([
      "DDR5",
      "LPDDR5",
      "LPDDR5X",
      "DDR4",
      "LPDDR4X",
    ]);
  });
});
