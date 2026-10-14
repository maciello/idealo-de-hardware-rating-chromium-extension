import { describe, expect, it } from "vitest";
import { g3dScore, gpuValuePerEuro } from "../../../src";
import { recordNamed, specs } from "./fixtures";

describe("GPU score strategies", () => {
  const gpu = recordNamed(specs, "GeForce RTX 9060 Laptop GPU");

  it("g3dScore reports the raw G3D Mark", () => {
    expect(g3dScore.rate({ gpu })).toEqual({
      strategyId: "gpu_g3d_score",
      value: 16_000,
      display: "16,000",
      explanation: "PassMark G3D Mark of GeForce RTX 9060 Laptop GPU: 16,000.",
    });
  });

  it("gpuValuePerEuro divides the G3D Mark by the listing price", () => {
    expect(gpuValuePerEuro.label).toBe("G3D Mark per euro");
    expect(gpuValuePerEuro.rate({ gpu, priceEur: 800 })).toMatchObject({
      strategyId: "gpu_value_per_euro",
      value: 20,
      display: "20.0/€",
    });
  });

  it.each([undefined, 0, -5, Number.NaN])("gpuValuePerEuro is null for price %s", (priceEur) => {
    expect(gpuValuePerEuro.rate(priceEur === undefined ? { gpu } : { gpu, priceEur })).toBeNull();
  });
});
