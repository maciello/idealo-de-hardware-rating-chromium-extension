import { describe, expect, it } from "vitest";
import type { GpuReading, ItemRating } from "../../../../../src/features/ratings/model";
import { createGpuEngine } from "../../../../../src/features/ratings/model";
import { gpuCardRows, ratingExplanation } from "../../../../../src/features/ratings/view-model";
import { GPU_SPECS, type GpuSpec, gpuSnapshotOf } from "../../gpu-snapshot";

const engine = createGpuEngine(gpuSnapshotOf(...GPU_SPECS));

type Query = Parameters<typeof engine.rate>[0][number];
const rateOne = (query: Query, cpu?: ItemRating): GpuReading | null =>
  engine.rate([query], [cpu])[0] ?? null;
const laptop = (text: string, title = "Notebook"): Query => ({
  title,
  text,
  formFactor: "laptop",
});
const ratingOf = (reading: GpuReading | null, id: string) =>
  reading?.primary.rating?.ratings.find((r) => r.strategyId === id);

const wordsOf = (reading: GpuReading | null, id: string): string => {
  const rating = ratingOf(reading, id);
  if (rating === undefined) throw new Error(`no ${id} rating`);
  return ratingExplanation(rating);
};

describe("createGpuEngine: the dedicated card", () => {
  it("reads the card from a spec fragment and ranks it against the page's laptop GPUs", () => {
    const gpu = rateOne({
      title: "Alpha Notebook",
      text: "Intel Core i7-13700H, 16 GB RAM, NVIDIA GeForce RTX 4060, Windows 11",
      priceEur: 1500,
      formFactor: "laptop",
    });
    expect(gpu?.primary.kind).toBe("dedicated");
    expect(gpu?.primary.name).toBe("GeForce RTX 4060 Laptop GPU");
    expect(gpu?.primary.rating?.lowerBound).toBe(false);
    expect(gpu?.primary.rating?.ratings.map((r) => r.strategyId)).toEqual([
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
    const onLaptop = rateOne({ ...query, formFactor: "laptop" });
    const onDesktop = rateOne({ ...query, formFactor: "desktop" });
    expect(onLaptop?.primary.name).toBe("GeForce RTX 4060 Laptop GPU");
    expect(onDesktop?.primary.name).toBe("GeForce RTX 4060");
    expect(wordsOf(onDesktop, "gpu_g3d_percentile")).toContain("desktop GPUs");
  });

  it("reads the datasheet's graphics row on product pages", () => {
    const gpu = rateOne({
      title: "Beta Book",
      text: "Prozessor\tIntel Core i7-13700H\nGrafikkarte\tNVIDIA GeForce RTX 5060\nRAM\t32 GB",
      formFactor: "laptop",
    });
    expect(gpu?.primary.name).toBe("GeForce RTX 5060 Laptop GPU");
  });

  it("falls back to the title when the spec text names no card", () => {
    const gpu = rateOne(
      laptop("", "Gamma Notebook (Intel Core i5, NVIDIA GeForce RTX 4060, 16 GB)"),
    );
    expect(gpu?.primary.name).toBe("GeForce RTX 4060 Laptop GPU");
  });

  it("rates an ambiguous text by its weakest card and gives no percentile without a form factor", () => {
    const gpu = rateOne({ title: "Notebook", text: "NVIDIA GeForce RTX 4060" });
    expect(gpu?.primary.rating?.lowerBound).toBe(true);
    expect(gpu?.primary.name).toBe("GeForce RTX 4060 Laptop GPU");
    expect(gpu?.primary.rating?.variants).toHaveLength(2);
    expect(ratingOf(gpu, "gpu_g3d_percentile")).toBeUndefined();
    if (gpu === null) throw new Error("expected a GPU line");
    const row = gpuCardRows(gpu.primary).find((r) => r.id === "gpu_g3d_score");
    expect(row?.title).toContain("Lower bound: the text matches 2 cards (");
  });
});

describe("createGpuEngine: GPU or iGPU", () => {
  it("shows the card as the GPU line and the CPU's iGPU as the companion", () => {
    const gpu = rateOne(laptop("Intel Core i7-13700H, NVIDIA GeForce RTX 4060"));
    expect(gpu?.primary).toMatchObject({ kind: "dedicated", name: "GeForce RTX 4060 Laptop GPU" });
    expect(gpu?.companion).toMatchObject({ kind: "integrated", name: "Intel Iris Xe" });
    expect(gpu?.companion?.rating?.record.g3dMark).toBe(2_500);
  });

  it("shows the CPU's iGPU, labelled integrated, when the tile names no card", () => {
    const gpu = rateOne(laptop("Intel Core Ultra 7 258V, 32 GB RAM"));
    expect(gpu?.primary).toMatchObject({ kind: "integrated", name: "Intel Arc 140V GPU" });
    expect(gpu?.companion).toBeNull();
    expect(ratingOf(gpu, "gpu_g3d_score")?.value).toBe(2_900);
    expect(wordsOf(gpu, "gpu_g3d_percentile")).toContain("of 5 laptop GPUs");
  });

  it.each([
    ["Intel Core i7-13700H", "Intel Iris Xe"],
    ["AMD Ryzen 7 7840U", "Radeon 780M"],
    ["Intel Core Ultra 7 258V", "Intel Arc 140V GPU"],
  ])("derives the iGPU of %s from the CPU", (cpu, name) => {
    expect(rateOne(laptop(`${cpu}, 16 GB RAM`))?.primary).toMatchObject({
      kind: "integrated",
      name,
    });
  });

  it("never reads an iGPU from the text: a CPU the table does not know yields no line", () => {
    expect(rateOne(laptop("Intel Core, Intel Iris Xe Graphics"))).toBeNull();
    expect(rateOne(laptop("AMD Radeon 780M"))).toBeNull();
  });

  it("takes the iGPU from the CPU even when the text names another one", () => {
    const gpu = rateOne(laptop("Intel Core Ultra 7 258V, Intel Iris Xe Graphics"));
    expect(gpu?.primary.name).toBe("Intel Arc 140V GPU");
  });

  it("picks the card when the tile names the iGPU first and the card second", () => {
    const gpu = rateOne(
      laptop("Intel Core i7-13700H, Intel Iris Xe Graphics, NVIDIA GeForce RTX 4060"),
    );
    expect(gpu?.primary).toMatchObject({ kind: "dedicated", name: "GeForce RTX 4060 Laptop GPU" });
    expect(gpu?.companion?.name).toBe("Intel Iris Xe");
  });

  it("shows no GPU line for a CPU without graphics (F part) and no card", () => {
    expect(rateOne(laptop("Intel Core i5-13400F, 16 GB RAM"))).toBeNull();
    expect(rateOne({ title: "PC", text: "AMD Ryzen 7 5800X", formFactor: "desktop" })).toBeNull();
  });

  it("shows only the card for a CPU without graphics", () => {
    const gpu = rateOne(laptop("Intel Core i5-13400F, NVIDIA GeForce RTX 4060"));
    expect(gpu?.primary.kind).toBe("dedicated");
    expect(gpu?.companion).toBeNull();
  });

  it("names a known iGPU that PassMark has no row for, unrated, with no score", () => {
    const gpu = rateOne(laptop("Apple M3 (10-Core GPU)"));
    expect(gpu?.primary).toMatchObject({
      kind: "integrated",
      name: "Apple M-series GPU",
      rating: null,
    });
  });

  it("names the iGPU unrated when the imported snapshot lacks its row", () => {
    const gpu = rateOne(laptop("Intel Core i5-13400, 16 GB RAM"));
    expect(gpu?.primary).toMatchObject({
      kind: "integrated",
      name: "Intel UHD Graphics 730",
      rating: null,
    });
  });

  it("flags an iGPU shown by the nearest PassMark row", () => {
    const withVega = createGpuEngine(
      gpuSnapshotOf({ name: "Radeon Vega 8", cat: "Mobile", g3d: 1_900 }),
    );
    const [gpu] = withVega.rate([laptop("AMD Ryzen 5 5600G")]);
    expect(gpu?.primary).toMatchObject({ name: "Radeon Vega 8", approximated: true });
  });

  it("reads the CPU from the CPU engine's match when the tile only abbreviates it", () => {
    const matched = { status: "matched", record: { name: "Intel Core Ultra 7 258V" } } as never;
    expect(rateOne(laptop("16 GB RAM"))).toBeNull();
    expect(rateOne(laptop("16 GB RAM"), matched)?.primary.name).toBe("Intel Arc 140V GPU");
  });

  it.each([
    ["a GPU the snapshot lacks", "NVIDIA GeForce RTX 9090"],
    ["generic graphics", "Grafikkarte\tIntegriert"],
    ["nothing about graphics or the CPU", "16 GB RAM, Windows 11"],
  ])("is null for %s", (_name, text) => {
    expect(rateOne(laptop(text))).toBeNull();
  });

  it("rates every query of one call on its own", () => {
    const results = engine.rate([
      laptop("NVIDIA GeForce RTX 5060", "A"),
      laptop("no gpu", "B"),
      laptop("AMD Ryzen 7 7840U", "C"),
    ]);
    expect(results.map((r) => r?.primary.name ?? null)).toEqual([
      "GeForce RTX 5060 Laptop GPU",
      null,
      "Radeon 780M",
    ]);
  });
});

describe("createGpuEngine: graphics memory by source priority", () => {
  const memoryOf = (text: string, specs: readonly GpuSpec[] = GPU_SPECS) => {
    const [gpu] = createGpuEngine(gpuSnapshotOf(...specs)).rate([laptop(text)]);
    return gpu?.primary.memory ?? null;
  };

  it("takes the size the tile states over PassMark's typical size", () => {
    expect(memoryOf("NVIDIA GeForce RTX 5060, Grafikspeicher 16 GB")).toEqual({
      source: "stated",
      megabytes: 16_384,
      type: null,
    });
  });

  it("reads 'Grafikspeicher 16384 MB / 16 GB' and the memory type row", () => {
    expect(
      memoryOf("NVIDIA GeForce RTX 5060, Grafikspeicher 16384 MB / 16 GB, Grafikspeichertyp GDDR7"),
    ).toEqual({ source: "stated", megabytes: 16_384, type: "GDDR7" });
  });

  it("takes the size written behind the model as stated", () => {
    expect(memoryOf("NVIDIA GeForce RTX 5060 (12GB)")).toMatchObject({
      source: "stated",
      megabytes: 12_288,
    });
  });

  it("falls back to PassMark's memory size, as typical", () => {
    expect(memoryOf("NVIDIA GeForce RTX 5060")).toEqual({
      source: "typical",
      megabytes: 8_192,
      type: null,
    });
  });

  it("has no memory for a card the tile and PassMark give no size for", () => {
    expect(memoryOf("NVIDIA GeForce RTX 4060")).toBeNull();
  });

  it("says shared for an iGPU, with or without 'Shared Memory' on the tile", () => {
    const shared = { source: "shared", megabytes: null, type: null };
    expect(memoryOf("Intel Core Ultra 7 258V")).toEqual(shared);
    expect(memoryOf("Intel Core Ultra 7 258V, Grafikspeicher Shared Memory")).toEqual(shared);
  });

  it("does not take a size the tile states for an iGPU: it belongs to a card", () => {
    expect(
      memoryOf("Intel Core Ultra 7 258V, Grafikspeicher 8 GB, Grafikspeichertyp GDDR6"),
    ).toEqual({ source: "shared", megabytes: null, type: null });
  });

  it("never uses PassMark's memory size for an iGPU", () => {
    const specs: GpuSpec[] = [
      { name: "Intel Iris Xe", cat: "Unknown", g3d: 2_500, memSize: "2048 MB" },
    ];
    expect(memoryOf("Intel Core i7-13700H", specs)).toMatchObject({ source: "shared" });
  });

  it("gives the iGPU beside a card shared memory, not the card's size", () => {
    const [gpu] = engine.rate([
      laptop("Intel Core i7-13700H, NVIDIA GeForce RTX 5060, Grafikspeicher 16 GB"),
    ]);
    expect(gpu?.primary.memory).toMatchObject({ source: "stated", megabytes: 16_384 });
    expect(gpu?.companion?.memory).toMatchObject({ source: "shared" });
  });

  it("ignores 'Shared Memory' on a card", () => {
    expect(memoryOf("NVIDIA GeForce RTX 5060, Grafikspeicher Shared Memory")).toMatchObject({
      source: "typical",
    });
  });
});
