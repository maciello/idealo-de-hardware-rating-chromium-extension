import { describe, expect, it } from "vitest";
import { g3dScore, gpuValuePerEuro } from "../../../src";
import { recordNamed, specs } from "./fixtures";

describe("GPU score strategies", () => {
  const gpu = recordNamed(specs, "GeForce RTX 9060 Laptop GPU");

  it("g3dScore reports the raw G3D Mark", () => {
    expect(g3dScore.rate({ gpu })).toEqual({
      kind: "score",
      strategyId: "gpu_g3d_score",
      value: 16_000,
      metric: "g3d_mark",
      subject: "GeForce RTX 9060 Laptop GPU",
    });
  });

  it("gpuValuePerEuro divides the G3D Mark by the listing price", () => {
    expect(gpuValuePerEuro.label).toBe("G3D Mark per euro");
    expect(gpuValuePerEuro.rate({ gpu, priceEur: 800 })).toEqual({
      kind: "per_euro",
      strategyId: "gpu_value_per_euro",
      value: 20,
      metric: "g3d_mark",
      score: 16_000,
      priceEur: 800,
    });
  });

  it.each([undefined, 0, -5, Number.NaN])("gpuValuePerEuro is null for price %s", (priceEur) => {
    expect(gpuValuePerEuro.rate(priceEur === undefined ? { gpu } : { gpu, priceEur })).toBeNull();
  });
});
