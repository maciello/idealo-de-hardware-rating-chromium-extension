import { describe, expect, it } from "vitest";
import { createStrategies, defaultStrategies } from "../../../src";
import { cpuRow, cpuSnapshotOf } from "../../fixtures";

describe("registry", () => {
  it("defaultStrategies have unique ids and need no snapshot", () => {
    const ids = defaultStrategies.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "raw_multithread_score",
      "single_thread_score",
      "value_per_euro",
      "peer_percentile_on_listing",
    ]);
  });

  it("createStrategies adds the snapshot-bound strategy", () => {
    const all = createStrategies(cpuSnapshotOf(cpuRow()));
    expect(all.map((s) => s.id)).toEqual([
      ...defaultStrategies.map((s) => s.id),
      "segment_percentile",
    ]);
  });
});
