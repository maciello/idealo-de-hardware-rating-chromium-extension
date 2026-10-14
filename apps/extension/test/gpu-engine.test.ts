import { describe, expect, it } from "vitest";
import { createGpuEngine } from "../src/ratings/gpu-engine";
import { GPU_SPECS, gpuSnapshotOf } from "./gpu-snapshot";

const engine = createGpuEngine(gpuSnapshotOf(...GPU_SPECS));

const rateOne = (query: Parameters<typeof engine.rate>[0][number]) => engine.rate([query])[0];
const ratingOf = (gpu: ReturnType<typeof rateOne>, id: string) =>
  gpu?.ratings.find((r) => r.strategyId === id);

describe("createGpuEngine", () => {
  it("reads the GPU from a spec fragment and ranks it against the page's laptop GPUs", () => {
    const gpu = rateOne({
      title: "Alpha Notebook",
      text: "Intel Core i7-13700H, 16 GB RAM, NVIDIA GeForce RTX 4060, Windows 11",
      priceEur: 1500,
      formFactor: "laptop",
    });
    expect(gpu?.record.name).toBe("GeForce RTX 4060 Laptop GPU");
    expect(gpu?.lowerBound).toBe(false);
    expect(gpu?.ratings.map((r) => r.strategyId)).toEqual([
      "gpu_g3d_score",
      "gpu_value_per_euro",
      "gpu_g3d_percentile",
    ]);
    expect(ratingOf(gpu, "gpu_g3d_score")?.value).toBe(15_000);
    // laptop set [2500, 2900, 6700, 15000, 18000]: 15000 beats three and counts itself, inclusive: 4 / 5.
    expect(ratingOf(gpu, "gpu_g3d_percentile")?.value).toBe(80);
    expect(ratingOf(gpu, "gpu_value_per_euro")?.value).toBe(10);
  });

  it("lets the page decide between the laptop and the desktop card of one model", () => {
    const query = { title: "RTX 4060 PC", text: "NVIDIA GeForce RTX 4060" };
    const laptop = rateOne({ ...query, formFactor: "laptop" });
    const desktop = rateOne({ ...query, formFactor: "desktop" });
    expect(laptop?.record.name).toBe("GeForce RTX 4060 Laptop GPU");
    expect(desktop?.record.name).toBe("GeForce RTX 4060");
    expect(ratingOf(desktop, "gpu_g3d_percentile")?.explanation).toContain("desktop GPUs");
  });

  it.each([
    ["Intel Iris Xe Graphics", "Intel Iris Xe Graphics"],
    ["AMD Radeon 780M", "Radeon 780M"],
    ["Intel Arc Graphics 140V", "Intel Arc 140V GPU"],
  ])("rates integrated graphics (%s) in the laptop pool", (text, name) => {
    const gpu = rateOne({ title: "Notebook", text: `Intel Core, ${text}`, formFactor: "laptop" });
    expect(gpu?.record.name).toBe(name);
    expect(ratingOf(gpu, "gpu_g3d_percentile")?.explanation).toContain("of 5 laptop GPUs");
  });

  it("reads the datasheet's graphics row on product pages", () => {
    const gpu = rateOne({
      title: "Beta Book",
      text: "Prozessor\tIntel Core i7-13700H\nGrafikkarte\tNVIDIA GeForce RTX 5060\nRAM\t32 GB",
      formFactor: "laptop",
    });
    expect(gpu?.record.name).toBe("GeForce RTX 5060 Laptop GPU");
  });

  it("falls back to the title when the spec text names no GPU", () => {
    const gpu = rateOne({
      title: "Gamma Notebook (Intel Core i5, Intel Iris Xe Graphics, 16 GB)",
      text: "",
      formFactor: "laptop",
    });
    expect(gpu?.record.name).toBe("Intel Iris Xe Graphics");
  });

  it("rates an ambiguous text by its weakest card and gives no percentile without a form factor", () => {
    const gpu = rateOne({ title: "Notebook", text: "NVIDIA GeForce RTX 4060" });
    expect(gpu?.lowerBound).toBe(true);
    expect(gpu?.record.name).toBe("GeForce RTX 4060 Laptop GPU");
    expect(gpu?.variants).toHaveLength(2);
    expect(ratingOf(gpu, "gpu_g3d_percentile")).toBeUndefined();
    expect(ratingOf(gpu, "gpu_g3d_score")?.explanation).toContain("Lower bound");
  });

  it.each([
    ["no GPU named", "Intel Core i7-13700H, 16 GB RAM, Grafikspeicher 8 GB"],
    ["a GPU the snapshot lacks", "NVIDIA GeForce RTX 9090"],
    ["a vendor outside the matcher", "Apple M3 (10-Core GPU)"],
    ["generic graphics", "Grafikkarte\tIntegriert"],
  ])("is null for %s", (_name, text) => {
    expect(rateOne({ title: "Notebook", text, formFactor: "laptop" })).toBeNull();
  });

  it("rates every query of one call on its own", () => {
    const results = engine.rate([
      { title: "A", text: "NVIDIA GeForce RTX 5060", formFactor: "laptop" },
      { title: "B", text: "no gpu", formFactor: "laptop" },
      { title: "C", text: "AMD Radeon 780M", formFactor: "laptop" },
    ]);
    expect(results.map((r) => r?.record.name ?? null)).toEqual([
      "GeForce RTX 5060 Laptop GPU",
      null,
      "Radeon 780M",
    ]);
  });
});
