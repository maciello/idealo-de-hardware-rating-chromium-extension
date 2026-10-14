import { describe, expect, it } from "vitest";
import { createGpuStrategies, createStrategies, gpuDefaultStrategies } from "../../../src";
import { cpuRow, cpuSnapshotOf } from "../../fixtures";
import { snapshotOf, specs } from "./fixtures";

describe("GPU strategy registry", () => {
  it("lists the default strategies in rating order", () => {
    expect(gpuDefaultStrategies.map((s) => s.id)).toEqual(["gpu_g3d_score", "gpu_value_per_euro"]);
  });

  it("createGpuStrategies adds the snapshot-bound percentile last", () => {
    expect(createGpuStrategies(snapshotOf(...specs)).map((s) => s.id)).toEqual([
      "gpu_g3d_score",
      "gpu_value_per_euro",
      "gpu_g3d_percentile",
    ]);
  });

  it("uses ids distinct from the CPU strategies, so one rating list can hold both", () => {
    const cpuIds = createStrategies(cpuSnapshotOf(cpuRow())).map((s) => s.id);
    const gpuIds = createGpuStrategies(snapshotOf(...specs)).map((s) => s.id);
    expect(gpuIds.filter((id) => cpuIds.includes(id))).toEqual([]);
  });
});
