import type { GpuMatchRating } from "@idealo-hw/hw-bench";
import { describe, expect, it } from "vitest";
import { createGpuEngine } from "../src/ratings/gpu-engine";
import { chipAria } from "../src/ratings/present";
import { gpuCardHead, gpuCardRows, gpuLineModel, gpuValueText } from "../src/ratings/present-gpu";
import { GPU_SPECS, gpuSnapshotOf } from "./gpu-snapshot";

const engine = createGpuEngine(gpuSnapshotOf(...GPU_SPECS));

const rate = (text: string, formFactor: "laptop" | "desktop" | "unknown" = "laptop") => {
  const [gpu] = engine.rate([{ title: "Notebook", text, priceEur: 1500, formFactor }]);
  if (!gpu) throw new Error("expected a GPU match");
  return gpu;
};

describe("gpuLineModel", () => {
  it("shows the G3D Mark with the percentile meter and names the comparison group", () => {
    const model = gpuLineModel(rate("NVIDIA GeForce RTX 4060"));
    expect(model).toMatchObject({
      value: "15.000",
      label: "GPU",
      filled: 4,
      context: "top 20% of laptop GPUs",
    });
    expect(model?.aria).toBe("GPU rating G3D Mark 15.000, top 20% of laptop GPUs");
  });

  it("follows the page's form factor", () => {
    expect(gpuLineModel(rate("NVIDIA GeForce RTX 4060", "desktop"))?.context).toMatch(
      /of desktop GPUs$/,
    );
  });

  it("fills the meter from the segment percentile: ceil(percentile / 20)", () => {
    expect(gpuLineModel(rate("NVIDIA GeForce RTX 5060"))?.filled).toBe(5);
    expect(gpuLineModel(rate("Intel Iris Xe Graphics"))?.filled).toBe(1);
  });

  it("hides the meter, not the line, without a form factor", () => {
    expect(gpuLineModel(rate("AMD Radeon 780M", "unknown"))).toMatchObject({
      value: "6.700",
      filled: null,
      context: null,
    });
  });

  it("hedges the context when the match was ambiguous", () => {
    const model = gpuLineModel(rate("NVIDIA GeForce RTX 4060", "unknown"));
    expect(model?.context).toBeNull();
    const hedged: GpuMatchRating = { ...rate("NVIDIA GeForce RTX 4060"), lowerBound: true };
    expect(gpuLineModel(hedged)?.context).toBe("at least top 20% of laptop GPUs");
  });

  it("is null when no strategy produced a rating", () => {
    expect(gpuLineModel({ ...rate("NVIDIA GeForce RTX 4060"), ratings: [] })).toBeNull();
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

  it("omits the per-euro row without a price", () => {
    const [gpu] = engine.rate([
      { title: "N", text: "NVIDIA GeForce RTX 4060", formFactor: "laptop" },
    ]);
    expect(gpu && gpuCardRows(gpu).map((r) => r.id)).toEqual([
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
});

describe("gpuValueText and chipAria", () => {
  it("falls back to the strategy's own display for unknown strategies", () => {
    expect(gpuValueText({ strategyId: "future", value: 1, display: "X1", explanation: "" })).toBe(
      "X1",
    );
  });

  it("joins one sentence per line before the hint", () => {
    expect(chipAria(["CPU rating A", "GPU rating B"])).toBe(
      "CPU rating A. GPU rating B. Show details",
    );
  });
});
