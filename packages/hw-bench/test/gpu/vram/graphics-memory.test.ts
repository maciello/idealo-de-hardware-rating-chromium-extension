import { describe, expect, it } from "vitest";
import { graphicsMemoryOf } from "../../../src/gpu";

describe("graphicsMemoryOf", () => {
  it.each([
    ["Grafikspeicher 16 GB", 16],
    ["Grafikspeicher 8 GB", 8],
    ["Grafikspeicher 8 GB", 8],
    ["Grafikspeicher 16GB", 16],
    ["Grafikspeicher 16384 MB / 16 GB", 16],
    ["Grafikspeicher: 12 GB", 12],
    ["grafikspeicher 24 gb", 24],
  ])("reads the size of tile fragment %j", (fragment, gigabytes) => {
    expect(graphicsMemoryOf([fragment])).toEqual({ shared: false, gigabytes, type: null });
  });

  it("reads Shared Memory as shared, with no size", () => {
    expect(graphicsMemoryOf(["Grafikspeicher Shared Memory"])).toEqual({
      shared: true,
      gigabytes: null,
      type: null,
    });
  });

  it("reads the memory type row next to the size", () => {
    expect(graphicsMemoryOf(["Grafikspeicher 16 GB", "Grafikspeichertyp GDDR7"])).toEqual({
      shared: false,
      gigabytes: 16,
      type: "GDDR7",
    });
    expect(graphicsMemoryOf(["Grafikspeichertyp LPDDR5X"])).toEqual({
      shared: false,
      gigabytes: null,
      type: "LPDDR5X",
    });
  });

  it("reads datasheet rows, tab separated, one per line", () => {
    const text =
      "Prozessor\tIntel Core i7\nGrafikspeicher\t16 GB\nGrafikspeichertyp\tGDDR6\nRAM\t32 GB";
    expect(graphicsMemoryOf([text])).toEqual({ shared: false, gigabytes: 16, type: "GDDR6" });
  });

  it("takes the first stated size", () => {
    expect(graphicsMemoryOf(["Grafikspeicher 8 GB", "Grafikspeicher 16 GB"])?.gigabytes).toBe(8);
  });

  it("does not take system memory for graphics memory", () => {
    expect(graphicsMemoryOf(["16 GB RAM", "32 GB DDR5", "Arbeitsspeicher 16 GB"])).toBeNull();
    expect(graphicsMemoryOf(["Grafikspeicher 16 GB RAM"])).toBeNull();
  });

  it("does not read the type row as a size, nor a type that is no memory", () => {
    expect(graphicsMemoryOf(["Grafikspeichertyp 16 GB"])).toBeNull();
    expect(graphicsMemoryOf(["Grafikspeichertyp Shared"])).toBeNull();
  });

  it("is null when the text says nothing about graphics memory", () => {
    expect(graphicsMemoryOf([])).toBeNull();
    expect(
      graphicsMemoryOf(["Intel Core i7-13700H", "Grafikkarte NVIDIA GeForce RTX 4060"]),
    ).toBeNull();
  });
});
