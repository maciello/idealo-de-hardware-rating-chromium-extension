import { describe, expect, it } from "vitest";
import { isIntegratedGpu } from "../../../src/gpu";

describe("isIntegratedGpu", () => {
  it.each([
    "Radeon 780M",
    "Radeon 660M",
    "Radeon 8060S",
    "Intel Iris Xe",
    "Intel Iris Xe Graphics",
    "Intel UHD Graphics",
    "Intel UHD Graphics 770",
    "Intel HD 4400",
    "Intel Arc",
    "Intel Arc Graphics",
    "Intel Arc 140V GPU",
    "Intel Graphics",
    "Radeon Vega 8",
    "Radeon RX Vega 11",
    "Qualcomm Adreno X1-85 GPU",
  ])("treats %s as integrated", (name) => {
    expect(isIntegratedGpu(name)).toBe(true);
  });

  it.each([
    "GeForce RTX 4060",
    "GeForce RTX 4060 Laptop GPU",
    "GeForce GTX 1650",
    "GeForce MX150",
    "GeForce 920M",
    "Radeon RX 7600",
    "Radeon RX 6700S",
    "Intel Arc A770",
    "Intel Arc A380",
    "Intel Arc B580",
    "RTX A2000",
  ])("treats %s as a discrete card", (name) => {
    expect(isIntegratedGpu(name)).toBe(false);
  });

  it("does not take PassMark's category or memory column as the signal", () => {
    // Radeon 780M is filed under Mobile, GeForce 920M has no memory size: neither column separates the two.
    expect(isIntegratedGpu("Radeon 780M")).toBe(true);
    expect(isIntegratedGpu("GeForce 920M")).toBe(false);
  });
});
