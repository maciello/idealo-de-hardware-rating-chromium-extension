import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { extractCpuIdentity, normalizeCpuName } from "../src";

const keyOf = (text: string) => extractCpuIdentity(text)?.key ?? null;

describe("extractCpuIdentity", () => {
  it.each([
    ["Intel Core i7-13700H, 14x 2.40GHz", "intel-core-i7-13700h"],
    ["Intel® Core™ i7-13700HX", "intel-core-i7-13700hx"],
    ["Intel(R) Core(TM) i5-1335U", "intel-core-i5-1335u"],
    ["AMD Ryzen 7 7840HS (8x 3.80GHz)", "amd-ryzen-7-7840hs"],
    ["Apple M3 Pro (11-Core CPU)", "apple-m3-pro-11-core"],
    ["Apple M3 Pro 12-Core", "apple-m3-pro-12-core"],
    ["Intel Core Ultra 7 155H", "intel-core-ultra-7-155h"],
    ["Intel Core Ultra 7 258V", "intel-core-ultra-7-258v"],
    ["Intel N100", "intel-n100"],
    ["Intel Processor N100", "intel-n100"],
    ["AMD Ryzen AI 9 HX 370", "amd-ryzen-ai-9-hx-370"],
    ["Intel Core i5-1335U", "intel-core-i5-1335u"],
    ["AMD Ryzen 9 7950X3D", "amd-ryzen-9-7950x3d"],
    ["Intel Core i5-12400F", "intel-core-i5-12400f"],
    ["Qualcomm Snapdragon X Elite X1E-78-100", "qualcomm-snapdragon-x1e-78-100"],
    ["Intel Core i7-4770", "intel-core-i7-4770"],
  ])("extracts %j", (text, key) => {
    expect(keyOf(text)).toBe(key);
  });

  it("keeps suffix letters as part of the identity", () => {
    const keys = [
      "Intel Core i7-13700H",
      "Intel Core i7-13700HX",
      "Intel Core i7-13700",
      "Intel Core i7-13700K",
      "Intel Core i7-13700KF",
      "Intel Core i5-1335U",
      "Intel Core i5-1335UE",
      "AMD Ryzen 5 7600X",
      "AMD Ryzen 5 7600X3D",
      "AMD Ryzen 5 7600",
      "AMD Ryzen 7 7840H",
      "AMD Ryzen 7 7840HS",
      "AMD Ryzen 7 7840HX",
      "AMD Ryzen 7 PRO 7840HS",
      "AMD Ryzen AI 9 365",
      "AMD Ryzen AI 9 HX 370",
      "AMD Ryzen AI 9 HX PRO 370",
      "Intel Core i7-1065G7",
      "Intel Core Ultra 9 285",
      "Intel Core Ultra 9 285K",
      "Intel Core Ultra 9 285HX",
    ].map(keyOf);
    expect(keys.every((key) => key !== null)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("includes the core count for Apple chips only when it is stated", () => {
    expect(extractCpuIdentity("Apple M4")).toMatchObject({
      key: "apple-m4",
      cores: null,
      coreAgnosticKey: null,
    });
    expect(extractCpuIdentity("Apple M4 Max (14-Core CPU)")).toMatchObject({
      key: "apple-m4-max-14-core",
      cores: 14,
      coreAgnosticKey: "apple-m4-max",
    });
    expect(keyOf("Apple M2 Max 12-Core CPU, 38-Core GPU")).toBe("apple-m2-max-12-core");
    expect(keyOf("Apple M2 Max, 38-Core GPU")).toBe("apple-m2-max");
    expect(keyOf("Apple M1 8 Core 3200 MHz")).toBe("apple-m1-8-core");
  });

  it("describes the identity in vendor / family / model terms", () => {
    expect(extractCpuIdentity("Intel Core i7-13700H")).toMatchObject({
      vendor: "Intel",
      family: "Core i7",
      model: "13700H",
    });
    expect(extractCpuIdentity("AMD Ryzen AI 9 HX 370")).toMatchObject({
      vendor: "AMD",
      family: "Ryzen AI 9",
      model: "HX 370",
    });
  });

  it("finds the CPU inside a longer product title and ignores the rest", () => {
    expect(
      keyOf('Lenovo ThinkPad E14 Gen 5, 14", Intel Core i5-1335U, 16GB RAM, 512GB SSD, Win11'),
    ).toBe("intel-core-i5-1335u");
    expect(keyOf("ASUS TUF A15 | AMD Ryzen 7 7735HS | RTX 4060 | 16GB")).toBe("amd-ryzen-7-7735hs");
  });

  it("handles other mainstream forms", () => {
    expect(keyOf("Intel Core i3-N305")).toBe("intel-core-i3-n305");
    expect(keyOf("Intel Core 5 120U")).toBe("intel-core-5-120u");
    expect(keyOf("Intel Core Ultra 9 290HX Plus")).toBe("intel-core-ultra-9-290hx-plus");
    expect(keyOf("Intel Celeron N4500")).toBe("intel-celeron-n4500");
    expect(keyOf("Intel Pentium Gold G6400")).toBe("intel-pentium-gold-g6400");
    expect(keyOf("AMD Ryzen AI Max+ 395")).toBe("amd-ryzen-ai-max+-395");
    expect(keyOf("AMD Ryzen Threadripper PRO 5995WX")).toBe("amd-ryzen-threadripper-pro-5995wx");
    expect(keyOf("AMD Athlon Silver 3050U")).toBe("amd-athlon-silver-3050u");
    expect(keyOf("Snapdragon X Plus X1P-64-100")).toBe("qualcomm-snapdragon-x1p-64-100");
    expect(keyOf("Qualcomm Snapdragon X Elite - X1E78100")).toBe("qualcomm-snapdragon-x1e-78-100");
  });

  it("reads Celeron/Pentium N-series marketing names as the plain Intel N silicon", () => {
    expect(keyOf("Intel Celeron N150")).toBe("intel-n150");
    expect(keyOf("Intel Pentium N100")).toBe("intel-n100");
    expect(keyOf("Celeron N100, 8GB RAM")).toBe("intel-n100");
    expect(keyOf("Intel Celeron N150")).toBe(keyOf("Intel Processor N150"));
    expect(keyOf("Intel Celeron N5095")).toBe("intel-celeron-n5095");
    expect(keyOf("Intel Pentium Silver N6000")).toBe("intel-pentium-silver-n6000");
    expect(keyOf("Intel Pentium N3710")).toBe("intel-pentium-n3710");
  });

  it("reads 'Intel Core N355' without the tier digit", () => {
    expect(keyOf("Intel Core N355")).toBe("intel-core-n355");
    expect(keyOf("Intel Core 3 N355")).toBe("intel-core-3-n355");
    expect(keyOf("Intel Core i3-N305")).toBe("intel-core-i3-n305");
  });

  it("accepts a bare i-series model and space or odd-dash separators", () => {
    expect(keyOf("Notebook i7-13700H 16GB")).toBe("intel-core-i7-13700h");
    expect(keyOf("Intel Core i7 13700H")).toBe("intel-core-i7-13700h");
    expect(keyOf("INTEL CORE I7-13700H")).toBe("intel-core-i7-13700h");
    expect(keyOf("Intel Core i7‑13700H")).toBe("intel-core-i7-13700h");
    expect(keyOf("Intel Core i7 – 13700H")).toBe("intel-core-i7-13700h");
  });

  it("returns null instead of guessing", () => {
    for (const text of [
      "",
      "Samsung Galaxy S24 Ultra",
      "16GB RAM, 512GB SSD",
      "Intel Core i7 512GB SSD",
      "Intel Core i7 1024GB",
      "AMD Ryzen 5 512GB",
      "AMD Ryzen 7",
      "Intel Core i7",
      "Apple MacBook Pro 14",
      "Apple M",
      "Qualcomm Snapdragon 8 Gen 3",
      "Intel Xeon E5-2680 v4",
    ]) {
      expect(extractCpuIdentity(text), text).toBeNull();
    }
  });

  it("does not read part of a longer token", () => {
    expect(keyOf("Intel Core i7-13700HXEZ")).toBeNull();
    expect(keyOf("AMD Ryzen 7 7840HSX")).toBeNull();
  });

  it("is stable for any Intel Core model plus listing noise", () => {
    const models = fc.record({
      tier: fc.constantFrom("3", "5", "7", "9"),
      number: fc.integer({ min: 1000, max: 14999 }),
      suffix: fc.constantFrom("", "U", "H", "HX", "HK", "K", "KF", "F", "T", "P", "UE", "G7"),
    });
    const noise = fc.constantFrom("", ", 14x 2.40GHz", " (8x 3.80GHz)", ", 16GB RAM", " Prozessor");
    fc.assert(
      fc.property(models, noise, fc.boolean(), ({ tier, number, suffix }, tail, marks) => {
        const model = `${number}${suffix}`;
        const core = marks ? "Intel® Core™" : "Intel Core";
        expect(keyOf(`${core} i${tier}-${model}${tail}`)).toBe(
          `intel-core-i${tier}-${model.toLowerCase()}`,
        );
      }),
    );
  });
});

describe("normalizeCpuName", () => {
  it("drops clock, marks and separators from PassMark names", () => {
    expect(normalizeCpuName("Intel Core i7-4770 @ 3.40GHz")).toBe("intel-core-i7-4770");
    expect(normalizeCpuName("Apple M1 8 Core 3200 MHz")).toBe("apple-m1-8-core");
    expect(normalizeCpuName("AMD Ryzen 9 6980HX with Radeon Graphics")).toBe("amd-ryzen-9-6980hx");
    expect(normalizeCpuName("AMD  Turion X2 Dual-Core Mobile RM-70")).toBe(
      normalizeCpuName("AMD Turion X2 Dual Core Mobile RM-70"),
    );
  });
});
