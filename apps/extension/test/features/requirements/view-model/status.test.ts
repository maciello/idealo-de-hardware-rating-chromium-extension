import { type FacetPlan, filterId } from "@idealo-hw/idealo-query";
import { describe, expect, it } from "vitest";
import { statusLine } from "../../../../src/features/requirements/view-model/status";

describe("statusLine", () => {
  const plan = (over: Partial<FacetPlan>): FacetPlan => ({
    facet: "cpu_model",
    status: "applied",
    selected: [],
    partial: [],
    unmatched: [],
    unknownLabels: [],
    capped: false,
    ...over,
  });
  const option = (label: string) => ({
    filterId: filterId("1"),
    label,
    interval: null,
  });

  it("counts the selected options, with the partial ones alongside", () => {
    expect(statusLine(plan({ selected: [option("a")] }))).toBe("1 option");
    expect(statusLine(plan({ selected: [option("a"), option("b")], partial: [option("c")] }))).toBe(
      "2 options, 1 partly",
    );
  });

  it("says what could not be done", () => {
    expect(statusLine(plan({ status: "unsatisfiable" }))).toBe("no listed option meets this");
    expect(statusLine(plan({ status: "not_expressible", reason: "no_group" }))).toBe(
      "not filterable here",
    );
    expect(statusLine(plan({ status: "unconstrained" }))).toBe("every option meets this");
    expect(statusLine(undefined)).toBeNull();
  });

  it("warns about the 100-option cap for models only", () => {
    expect(statusLine(plan({ selected: [option("a")], capped: true }))).toBe(
      "1 option · 100-option cap: unlisted CPUs excluded",
    );
    expect(
      statusLine(plan({ facet: "gpu_model", selected: [option("a")], capped: true })),
    ).toContain("unlisted GPUs excluded");
    expect(statusLine(plan({ facet: "ram_gb", selected: [option("a")], capped: true }))).toBe(
      "1 option",
    );
  });
});
