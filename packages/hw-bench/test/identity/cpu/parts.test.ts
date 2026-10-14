import { describe, expect, it } from "vitest";
import { cpuModelParts, extractCpuIdentity } from "../../../src/identity";

const partsOf = (text: string) => {
  const identity = extractCpuIdentity(text);
  if (identity === null) throw new Error(`no identity for ${text}`);
  return cpuModelParts(identity);
};

describe("cpuModelParts", () => {
  it.each([
    ["AMD Ryzen 7 7840U", { number: 7840, prefix: "", suffix: "U" }],
    ["AMD Ryzen 9 7950X3D", { number: 7950, prefix: "", suffix: "X3D" }],
    ["AMD Ryzen 7 5800X", { number: 5800, prefix: "", suffix: "X" }],
    ["AMD Ryzen 5 230", { number: 230, prefix: "", suffix: "" }],
    ["Intel Core Ultra 7 258V", { number: 258, prefix: "", suffix: "V" }],
    ["Intel Core 7 150U", { number: 150, prefix: "", suffix: "U" }],
    ["Intel Processor N100", { number: 100, prefix: "N", suffix: "" }],
    ["Intel Celeron N4020", { number: 4020, prefix: "N", suffix: "" }],
    ["Apple M3", { number: 3, prefix: "M", suffix: "" }],
  ])("reads number, prefix and suffix of %s", (text, expected) => {
    expect(partsOf(text)).toMatchObject(expected);
  });

  it("reads tier words, PRO and PLUS around the number", () => {
    expect(partsOf("AMD Ryzen AI 9 HX 370")).toMatchObject({ number: 370, words: ["HX"] });
    expect(partsOf("AMD Ryzen AI Max+ 395")).toMatchObject({ number: 395, words: ["MAX+"] });
    expect(partsOf("AMD Ryzen 5 PRO 4650G")).toMatchObject({
      number: 4650,
      suffix: "G",
      pro: true,
      words: [],
    });
    expect(partsOf("Intel Core Ultra 7 270HX Plus")).toMatchObject({ suffix: "HX", plus: true });
    expect(partsOf("AMD Ryzen 7 7840U")).toMatchObject({ pro: false, plus: false, words: [] });
  });

  it.each([
    ["Intel Core i7-13700H", 13],
    ["Intel Core i9-14900HX", 14],
    ["Intel Core i5-1355U", 13],
    ["Intel Core i5-1240P", 12],
    ["Intel Core i7-1165G7", 11],
    ["Intel Core i7-1065G7", 10],
    ["Intel Core i7-8250U", 8],
    ["Intel Core i7-4770K", 4],
    ["Intel Core i7-2600K", 2],
    ["Intel Core i5-530", 1],
  ])("reads the Core i generation of %s", (text, generation) => {
    expect(partsOf(text).generation).toBe(generation);
  });

  it("has no generation outside the Core i families", () => {
    expect(partsOf("AMD Ryzen 7 7840U").generation).toBeNull();
    expect(partsOf("Intel Core Ultra 7 155H").generation).toBeNull();
    expect(partsOf("Intel Processor N100").generation).toBeNull();
  });

  it("leaves number, prefix and suffix null for a model without a number token", () => {
    expect(cpuModelParts({ family: "Snapdragon", model: "Elite" })).toEqual({
      number: null,
      prefix: null,
      suffix: null,
      generation: null,
      pro: false,
      plus: false,
      words: [],
    });
  });

  it("does not read a number out of the Snapdragon X model code", () => {
    expect(partsOf("Qualcomm Snapdragon X Plus X1P-64-100").number).toBeNull();
  });
});
