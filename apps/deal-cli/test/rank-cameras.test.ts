import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runRank } from "../src/run";
import { fixture, tempOut } from "./paths";

describe("rank on a synthetic camera pool, without PassMark files", () => {
  const result = runRank({
    wants: fixture("cameras", "wants.yaml"),
    candidates: [fixture("cameras", "cameras.yaml")],
    passmarkDir: null,
    out: tempOut(),
  });

  it("needs no passmark directory and raises no benchmark flags", () => {
    expect(result.warnings).toEqual([]);
    const flags = result.report.ranked.flatMap((r) => r.red_flags.map((f) => f.id));
    expect(flags).not.toContain("no_cpu_benchmark");
    expect(flags).not.toContain("no_gpu_benchmark");
  });

  it("excludes on a missing must-have feature and ranks the rest", () => {
    expect(result.report.excluded.map((e) => e.sku).sort()).toEqual(["CAM-3", "CAM-4"]);
    expect(result.report.excluded[0]?.reasons).toEqual([
      { check: "feature", value: "image_stabilisation", threshold: "required" },
    ]);
    expect(result.report.ranked.map((r) => r.sku)).toEqual(["CAM-1", "CAM-2"]);
  });

  it("shows a custom-metric standout", () => {
    const cam2 = result.report.ranked.find((r) => r.sku === "CAM-2");
    expect(cam2?.standouts).toContainEqual({ metric: "optical_zoom_x", value: 10, runner_up: 3 });
  });

  it("shows only columns with values, plus weighted custom metrics", () => {
    const md = readFileSync(result.markdownPath, "utf8");
    const header = md.split("\n").find((line) => line.startsWith("| # |")) ?? "";
    expect(header).toBe("| # | Product | Total | Score | Sensor (MP) | Optical zoom (x) |");
    expect(md).not.toContain("CPU (CPU Mark)");
    expect(md).toContain("Optical zoom (x) 10 (next best 3)");
  });
});
