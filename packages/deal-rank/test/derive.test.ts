import { describe, expect, it } from "vitest";
import { aiMemory, UNIFIED_FAST_MEMORY_PATTERN, webcamMegapixels } from "../src";
import { candidate } from "./helpers";

describe("webcamMegapixels", () => {
  it("prefers stated megapixels", () => {
    expect(webcamMegapixels({ megapixels: 5, height_px: 720, ir: null })).toBe(5);
  });
  it("derives 16:9 megapixels from the height", () => {
    const hd = webcamMegapixels({ megapixels: null, height_px: 720, ir: null });
    const fullHd = webcamMegapixels({ megapixels: null, height_px: 1080, ir: null });
    expect(hd).toBeCloseTo(0.92, 2);
    expect(fullHd).toBeCloseTo(2.07, 2);
  });
  it("is null with nothing to go on", () => {
    expect(webcamMegapixels({ megapixels: null, height_px: null, ir: null })).toBeNull();
  });
});

describe("aiMemory", () => {
  it("uses dedicated VRAM first", () => {
    const c = candidate({ gpu: "RTX 4070", vram_gb: 8, ram_gb: 32 });
    expect(aiMemory(c)).toEqual({ gb: 8, basis: "dedicated_vram" });
  });
  it("takes 75% of RAM, floored, on unified-fast chips", () => {
    const c = candidate({ cpu: "AMD Ryzen AI Max+ 395", gpu: "Radeon 8060S", ram_gb: 64 });
    expect(aiMemory(c)).toEqual({ gb: 48, basis: "unified_memory_estimate" });
    expect(aiMemory(candidate({ cpu: "Apple M4 Pro", ram_gb: 18 })).gb).toBe(13);
  });
  it("is null when a unified-fast chip has no RAM figure", () => {
    expect(aiMemory(candidate({ gpu: "Radeon 8050S" })).gb).toBeNull();
  });
  it("is 0 for ordinary integrated graphics", () => {
    expect(aiMemory(candidate({ cpu: "Intel Core i5-1335U", ram_gb: 16 }))).toEqual({
      gb: 0,
      basis: "none",
    });
  });
  it("keeps the pattern in one constant", () => {
    expect(UNIFIED_FAST_MEMORY_PATTERN.test("Radeon 8040S")).toBe(true);
    expect(UNIFIED_FAST_MEMORY_PATTERN.test("Radeon 780M")).toBe(false);
  });
});
