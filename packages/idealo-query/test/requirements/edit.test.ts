import { describe, expect, it } from "vitest";
import {
  emptyRequirements,
  isEmpty,
  METRIC,
  RequirementsSchema,
  setCombine,
  setLabels,
  setMinimum,
  setNumeric,
  setPriceRange,
} from "../../src/index";

describe("requirement updates", () => {
  it("sets and clears numeric bounds, dropping an empty requirement", () => {
    const set = setNumeric(emptyRequirements(), "ram_gb", { min: 32 });
    expect(set.numeric).toEqual({ ram_gb: { min: 32 } });
    expect(setNumeric(set, "ram_gb", {}).numeric).toEqual({});
  });

  it("keeps one entry per metric and removes the facet with its last minimum", () => {
    let requirements = setMinimum(emptyRequirements(), "cpu_model", METRIC.cpuMark, 20000, "all");
    requirements = setMinimum(requirements, "cpu_model", METRIC.cpuSingle, 3500, "all");
    expect(requirements.models.cpu_model).toEqual({
      minimums: { cpu_mark: 20000, cpu_single: 3500 },
      combine: "all",
    });
    requirements = setCombine(requirements, "cpu_model", "any");
    expect(requirements.models.cpu_model?.combine).toBe("any");
    requirements = setMinimum(requirements, "cpu_model", METRIC.cpuMark, undefined, "any");
    requirements = setMinimum(requirements, "cpu_model", METRIC.cpuSingle, undefined, "any");
    expect(requirements.models).toEqual({});
    expect(setCombine(requirements, "gpu_model", "any")).toBe(requirements);
  });

  it("stores label choices and price, and every update stays valid for the planner", () => {
    let requirements = setLabels(emptyRequirements(), "ram_type", ["DDR5", "LPDDR5X"]);
    requirements = setPriceRange(requirements, { min: 500 });
    expect(isEmpty(requirements)).toBe(false);
    expect(RequirementsSchema.parse(requirements)).toEqual(requirements);
    requirements = setPriceRange(setLabels(requirements, "ram_type", []), {});
    expect(isEmpty(requirements)).toBe(true);
  });
});
