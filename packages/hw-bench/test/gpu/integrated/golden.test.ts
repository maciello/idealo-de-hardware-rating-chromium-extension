import { describe, expect, it } from "vitest";
import { type IgpuRule, integratedGpuOf } from "../../../src/gpu";

/** "none", the PassMark name, or "unrated: <name>" for graphics PassMark has no row for. */
const answer = (rule: IgpuRule | null): string | null => {
  if (rule === null) return null;
  if (rule.igpu.kind === "none") return "none";
  return rule.igpu.kind === "unrated" ? `unrated: ${rule.igpu.name}` : rule.igpu.name;
};
const igpuOf = (cpu: string): string | null => answer(integratedGpuOf(cpu));

/**
 * CPU -> iGPU as the vendor pages state it (AMD product pages, Intel ARK, Qualcomm product briefs), written out
 * independently of the rule table. The right column is the PassMark GPU list name of that graphics.
 */
describe("integratedGpuOf: graphics named by the vendor", () => {
  it.each([
    // amd.com product pages
    ["AMD Ryzen 7 8700G", "Radeon 780M"],
    ["AMD Ryzen 5 7640U", "Radeon 760M"],
    ["AMD Ryzen 3 7320U", "Radeon 610M"],
    ["AMD Ryzen 9 7945HX", "Radeon 610M"],
    ["AMD Ryzen 5 230", "Radeon 760M"],
    ["AMD Ryzen AI 9 HX 370", "Radeon 890M"],
    ["AMD Ryzen AI 7 350", "Radeon 860M"],
    ["AMD Ryzen 7 7840U", "Radeon 780M"],
    ["AMD Ryzen AI Max+ 395", "Radeon 8060S"],
    // Intel ARK
    ["Intel Core Ultra 7 155H", "Intel Arc"],
    ["Intel Core Ultra 7 258V", "Intel Arc 140V GPU"],
    ["Intel Core Ultra 5 236V", "Intel Arc 130V GPU"],
    ["Intel Core Ultra 9 285H", "Intel Arc 140T GPU"],
    ["Intel Core Ultra 5 225U", "Intel Graphics"],
    ["Intel Core Ultra 7 265HX", "Intel Graphics"],
    ["Intel Core 7 150U", "Intel Iris Xe"],
    ["Intel Core i7-12700H", "Intel Iris Xe"],
    ["Intel Core i5-1240P", "Intel Iris Xe"],
    ["Intel Core i7-1165G7", "Intel Iris Xe"],
    ["Intel Core i7-1065G7", "Intel Iris Plus"],
    ["Intel Core i7-13700HX", "Intel UHD Graphics"],
    ["Intel Core i5-13400", "Intel UHD Graphics 730"],
    ["Intel Processor N100", "Intel UHD Graphics"],
    ["Intel Celeron N4020", "Intel UHD Graphics 600"],
    // Qualcomm product briefs
    ["Qualcomm Snapdragon X Plus X1P-42-100", "Qualcomm Adreno X1-45 GPU"],
    ["Qualcomm Snapdragon 7c", "Qualcomm Adreno 618 GPU"],
  ])("%s has %s", (cpu, igpu) => {
    expect(igpuOf(cpu)).toBe(igpu);
  });

  it("reads the CPU out of a longer tile fragment, with trademark marks and clock suffix", () => {
    expect(igpuOf("Intel® Core™ i7-13700H, 14x 2.40GHz")).toBe("Intel Iris Xe");
    expect(igpuOf("AMD Ryzen 7 7840HS (8x 3.80GHz)")).toBe("Radeon 780M");
  });
});

describe("integratedGpuOf: CPUs without graphics", () => {
  it.each([
    // F and KF Core parts: ARK lists "Processor Graphics: none"
    "Intel Core i5-13400F",
    "Intel Core i7-13700KF",
    "Intel Core i5-12400F",
    // AMD desktop Ryzen 1000-5000 without G suffix need a graphics card
    "AMD Ryzen 7 5800X",
    "AMD Ryzen 7 5700X3D",
    "AMD Ryzen 5 5600",
    "AMD Ryzen 7 3700X",
    // HEDT and server
    "AMD Ryzen Threadripper 3990X",
    "Intel Xeon E5-2678 v3",
    "Intel Xeon E5-2666 v3",
    "Intel Xeon W-2125",
    "Intel Core 2 Duo",
  ])("%s has none", (cpu) => {
    expect(igpuOf(cpu)).toBe("none");
  });

  it("gives an F part no graphics even though its non-F sibling has some", () => {
    expect(igpuOf("Intel Core i5-13400")).toBe("Intel UHD Graphics 730");
    expect(igpuOf("Intel Core i5-13400F")).toBe("none");
  });

  it("gives Ryzen 5000 G-series APUs graphics but the X parts none", () => {
    expect(igpuOf("AMD Ryzen 7 5700G")).toBe("Radeon Vega 8");
    expect(igpuOf("AMD Ryzen 7 5700X")).toBe("none");
  });
});

describe("integratedGpuOf: known graphics PassMark does not rate", () => {
  it.each([
    ["Apple M3", "unrated: Apple M-series GPU"],
    ["Apple M3 Pro", "unrated: Apple M-series GPU"],
    ["MediaTek Kompanio 520", "unrated: Mali-G52 MC2"],
  ])("%s is named but unrated", (cpu, expected) => {
    expect(igpuOf(cpu)).toBe(expected);
  });
});

describe("integratedGpuOf: CPUs the table does not know", () => {
  it.each([
    "AMD Athlon",
    "Intel Celeron",
    "Intel Pentium Dual Core",
    "AMD Ryzen 5 40",
    "",
    "NVIDIA GeForce RTX 4060",
  ])("returns null for %j rather than guessing", (text) => {
    expect(integratedGpuOf(text)).toBeNull();
  });

  it("never reads GPU text: a tile line naming only graphics finds nothing", () => {
    expect(integratedGpuOf("Intel Iris Xe Graphics")).toBeNull();
    expect(integratedGpuOf("AMD Radeon 780M")).toBeNull();
  });
});

describe("integratedGpuOf: AMD 3020e", () => {
  it("maps the label without an identity extractor through its slug", () => {
    expect(igpuOf("AMD 3020e")).toBe("Radeon Vega 3 3020e");
  });
});
