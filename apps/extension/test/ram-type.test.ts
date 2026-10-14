import { describe, expect, it } from "vitest";
import { ramTypeOf } from "../src/ratings/ram-type";

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
