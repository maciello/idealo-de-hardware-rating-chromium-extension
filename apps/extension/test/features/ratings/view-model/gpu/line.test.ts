import { describe, expect, it } from "vitest";
import { RATINGS_COPY } from "../../../../../src/features/ratings/copy";
import type { GpuPart, GpuReading } from "../../../../../src/features/ratings/model";
import { createGpuEngine } from "../../../../../src/features/ratings/model";
import {
  gpuCardHead,
  gpuCardRows,
  gpuCardSections,
  gpuLineModel,
  gpuMemoryRow,
  gpuValueText,
} from "../../../../../src/features/ratings/view-model";
import { GPU_SPECS, gpuSnapshotOf } from "../../gpu-snapshot";

const engine = createGpuEngine(gpuSnapshotOf(...GPU_SPECS));

const readingOf = (
  text: string,
  formFactor: "laptop" | "desktop" | "unknown" = "laptop",
): GpuReading => {
  const [gpu] = engine.rate([{ title: "Notebook", text, priceEur: 1500, formFactor }]);
  if (!gpu) throw new Error("expected a GPU reading");
  return gpu;
};
const rate = (text: string, formFactor: "laptop" | "desktop" | "unknown" = "laptop"): GpuPart =>
  readingOf(text, formFactor).primary;
/** The part of a tile that names only a CPU: the CPU's iGPU. */
const igpu = (cpu: string, formFactor: "laptop" | "desktop" | "unknown" = "laptop"): GpuPart =>
  rate(cpu, formFactor);

describe("gpuLineModel", () => {
  it("shows the G3D Mark with the percentile meter and names the comparison group", () => {
    const model = gpuLineModel(rate("NVIDIA GeForce RTX 4060"));
    expect(model).toMatchObject({
      value: "15.000",
      label: "GPU",
      filled: 4,
      context: "top 20% of laptop GPUs",
      unrated: false,
      memory: null,
    });
    expect(model?.aria).toBe("GPU rating G3D Mark 15.000, top 20% of laptop GPUs");
  });

  it("labels the CPU's graphics iGPU, never GPU", () => {
    const model = gpuLineModel(igpu("Intel Core Ultra 7 258V"));
    expect(model).toMatchObject({ label: "iGPU", value: "2.900", unrated: false });
    expect(model?.aria).toBe(
      "iGPU rating G3D Mark 2.900, top 60% of laptop GPUs, graphics memory shared",
    );
  });

  it("follows the page's form factor", () => {
    expect(gpuLineModel(rate("NVIDIA GeForce RTX 4060", "desktop"))?.context).toMatch(
      /of desktop GPUs$/,
    );
  });

  it("fills the meter from the segment percentile: ceil(percentile / 20)", () => {
    expect(gpuLineModel(rate("NVIDIA GeForce RTX 5060"))?.filled).toBe(5);
    expect(gpuLineModel(igpu("Intel Core i7-13700H"))?.filled).toBe(1);
  });

  it("hides the meter, not the line, without a form factor", () => {
    expect(gpuLineModel(igpu("AMD Ryzen 7 7840U", "unknown"))).toMatchObject({
      value: "6.700",
      filled: null,
      context: null,
    });
  });

  it("hedges the context when the match was ambiguous", () => {
    const model = gpuLineModel(rate("NVIDIA GeForce RTX 4060", "unknown"));
    expect(model?.context).toBeNull();
    const part = rate("NVIDIA GeForce RTX 4060");
    const hedged: GpuPart = {
      ...part,
      rating: part.rating && { ...part.rating, lowerBound: true },
    };
    expect(gpuLineModel(hedged)?.context).toBe("at least top 20% of laptop GPUs");
  });

  it("is null when no strategy produced a rating", () => {
    const part = rate("NVIDIA GeForce RTX 4060");
    expect(
      gpuLineModel({ ...part, rating: part.rating && { ...part.rating, ratings: [] } }),
    ).toBeNull();
  });

  it("shows the name of an unrated GPU instead of a score", () => {
    const model = gpuLineModel(igpu("Apple M3 (10-Core GPU)"));
    expect(model).toMatchObject({
      label: "iGPU",
      value: "Apple M-series GPU",
      unrated: true,
      filled: null,
      title: "Apple M-series GPU: PassMark has no rating for this GPU",
    });
    expect(model?.aria).toBe("iGPU Apple M-series GPU, unrated, graphics memory shared");
  });

  it("formats the memory: stated as is, PassMark's size as typical, an iGPU as shared", () => {
    expect(gpuLineModel(rate("NVIDIA GeForce RTX 5060, Grafikspeicher 16 GB"))?.memory?.text).toBe(
      "16 GB",
    );
    expect(
      gpuLineModel(rate("NVIDIA GeForce RTX 5060, Grafikspeicher 16 GB, Grafikspeichertyp GDDR7"))
        ?.memory?.text,
    ).toBe("16 GB GDDR7");
    expect(gpuLineModel(rate("NVIDIA GeForce RTX 5060"))?.memory).toMatchObject({
      text: "8 GB typical",
    });
    expect(gpuLineModel(igpu("Intel Core Ultra 7 258V"))?.memory?.text).toBe("shared");
  });
});

describe("gpuCardRows and gpuCardHead", () => {
  it("builds one row per strategy; the percentile row carries the meter", () => {
    const rows = gpuCardRows(rate("NVIDIA GeForce RTX 4060"));
    expect(rows.map((r) => [r.id, r.label, r.value])).toEqual([
      ["gpu_g3d_score", "G3D Mark", "15.000"],
      ["gpu_g3d_percentile", "In its class", "top 20%"],
      ["gpu_value_per_euro", "Per euro", "10,0 /€"],
    ]);
    expect(rows.map((r) => r.meter)).toEqual([null, { filled: 4, text: "of laptop GPUs" }, null]);
    expect(rows.every((r) => r.title.length > 0)).toBe(true);
  });

  it("puts the graphics memory in a row of its own, with its source as the title", () => {
    const part = rate("NVIDIA GeForce RTX 5060");
    expect(gpuCardRows(part).map((r) => r.id)).not.toContain("gpu_memory");
    const memory = gpuMemoryRow(part);
    expect(memory).toMatchObject({
      id: "gpu_memory",
      label: "Graphics memory",
      value: "8 GB typical",
    });
    expect(memory?.title).toContain("PassMark");
    expect(gpuMemoryRow(rate("NVIDIA GeForce RTX 4060"))).toBeNull();
  });

  it("omits the per-euro row without a price", () => {
    const [gpu] = engine.rate([
      { title: "N", text: "NVIDIA GeForce RTX 4060", formFactor: "laptop" },
    ]);
    expect(gpu && gpuCardRows(gpu.primary).map((r) => r.id)).toEqual([
      "gpu_g3d_score",
      "gpu_g3d_percentile",
    ]);
  });

  it("names the matched card, and says when it is only the weakest candidate", () => {
    expect(gpuCardHead(rate("NVIDIA GeForce RTX 4060"))).toEqual({
      title: "GeForce RTX 4060 Laptop GPU",
      sub: "Matched to PassMark GPU entry",
    });
    expect(gpuCardHead(rate("NVIDIA GeForce RTX 4060", "unknown")).sub).toBe(
      "Weakest of 2 cards the text could mean",
    );
  });

  it("says an iGPU is the CPU's, and an unrated one has no PassMark rating", () => {
    expect(gpuCardHead(igpu("Intel Core Ultra 7 258V"))).toEqual({
      title: "Intel Arc 140V GPU",
      sub: "Integrated graphics of the CPU",
    });
    expect(gpuCardHead(igpu("Apple M3"))).toEqual({
      title: "Apple M-series GPU",
      sub: "Unrated: PassMark has no rating for this GPU",
    });
  });
});

describe("gpuCardSections", () => {
  it("lists the card first and the CPU's iGPU second, with row ids that do not collide", () => {
    const sections = gpuCardSections(readingOf("Intel Core i7-13700H, NVIDIA GeForce RTX 4060"));
    expect(sections.map((s) => [s.testId, s.title])).toEqual([
      ["card-gpu", "GeForce RTX 4060 Laptop GPU"],
      ["card-igpu", "Intel Iris Xe"],
    ]);
    const ids = sections.flatMap((s) => s.rows.map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(sections[1]?.memory).toMatchObject({ id: "gpu_memory", value: "shared" });
  });

  it("has a single section when the CPU's iGPU is the GPU line", () => {
    expect(gpuCardSections(readingOf("Intel Core Ultra 7 258V")).map((s) => s.testId)).toEqual([
      "card-gpu",
    ]);
  });
});

describe("gpuValueText and chipAria", () => {
  it("falls back to the rating kind's own display for unknown strategies", () => {
    const base = { strategyId: "future", metric: "g3d_mark" } as const;
    expect(gpuValueText({ ...base, kind: "score", value: 16_000, subject: "" })).toBe("16.000");
    expect(gpuValueText({ ...base, kind: "per_euro", value: 20, score: 1, priceEur: 1 })).toBe(
      "20,0/€",
    );
  });

  it("joins one sentence per line before the hint", () => {
    expect(RATINGS_COPY.chipAria(["CPU rating A", "GPU rating B"])).toBe(
      "CPU rating A. GPU rating B. Show details",
    );
  });
});
