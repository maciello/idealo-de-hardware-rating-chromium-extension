import {
  emptyQuery,
  emptyRequirements,
  facetsOf,
  filterId,
  planRequirements,
  setMinimum,
  setNumeric,
} from "@idealo-hw/idealo-query";
import { describe, expect, it } from "vitest";
import {
  buildRequirementsViewModel,
  type RequirementsViewInput,
} from "../../../../src/features/requirements/view-model";
import { catalog, group } from "../catalog-fixtures";

const input = (over: Partial<RequirementsViewInput> = {}): RequirementsViewInput => ({
  requirements: emptyRequirements(),
  plan: null,
  scorer: () => null,
  hasData: { cpu: false, gpu: false },
  priceBounds: null,
  pagePrice: undefined,
  ...over,
});
const build = (groups: ReturnType<typeof group>[], over?: Partial<RequirementsViewInput>) =>
  buildRequirementsViewModel(facetsOf(catalog(...groups)), input(over));

describe("buildRequirementsViewModel", () => {
  it("is absent for a category without any requirement facet", () => {
    expect(build([group("Prozessor-Hersteller", ["Intel", "AMD"])])).toBeNull();
  });

  it("lists only the numeric controls the category has, in panel order", () => {
    const model = build([group("Gewicht", ["1,2 kg", "1,8 kg"]), group("RAM", ["8 GB", "16 GB"])]);
    expect(model?.numeric.map((entry) => entry.facet)).toEqual(["ram_gb", "weight_kg"]);
    expect(model?.cpu).toBeNull();
    expect(model?.gpu).toBeNull();
  });

  it("hints at the data import while there is none to rank CPUs by", () => {
    const model = build([group("Prozessor", ["Intel Core i7-13700H"])]);
    expect(model?.cpu).toEqual({ state: "no-data" });
  });

  it("builds the CPU block from the scorer once data exists", () => {
    const scorer = (_facet: string, label: string) =>
      label === "A" ? { cpu_mark: 10000, cpu_single: 2000 } : { cpu_mark: 20000, cpu_single: 3000 };
    const requirements = setMinimum(emptyRequirements(), "cpu_model", "cpu_mark", 15000, "any");
    const model = build([group("Prozessor", ["A", "B"])], {
      scorer,
      requirements,
      hasData: { cpu: true, gpu: false },
    });
    expect(model?.cpu).toMatchObject({
      state: "ready",
      combine: "any",
      combineDisabled: false,
      mark: { id: "cpu_mark", current: 15000, min: 10000, max: 20000 },
      single: { id: "cpu_single", min: 2000, max: 3000 },
    });
  });

  it("shows the price slider only with page bounds, preferring the page's price over none", () => {
    const groups = [group("RAM", ["8 GB", "16 GB"])];
    expect(build(groups)?.price).toBeNull();
    const model = build(groups, {
      priceBounds: { min: 400, max: 1300 },
      pagePrice: { max: 900 },
    });
    expect(model?.price?.valueText).toBe("up to 900 €");
  });

  it("puts the graphics memory slider right after the GPU block", () => {
    const model = build([
      group("RAM", ["8 GB", "16 GB"]),
      group("Grafikspeicher", ["4 GB", "8 GB", "16 GB"]),
      group("Grafikkarte", ["RTX 4060"]),
    ]);
    expect(model?.numeric.map((entry) => entry.facet)).toEqual(["vram_gb", "ram_gb"]);
    expect(model?.gpu).toEqual({ state: "no-data" });
  });

  describe("with two Grafikspeicher groups", () => {
    const memory = (attributeId: string, start: number, labels: string[]) => ({
      attributeId,
      name: "Grafikspeicher",
      filters: labels.map((label, i) => ({ filterId: filterId(String(start + i)), label })),
    });
    const listing = {
      ...catalog(),
      groups: [
        memory("15869", 100, ["Shared Memory", "4 GB", "8 GB", "16 GB"]),
        memory("31502", 200, ["4 GB", "8 GB", "16 GB", "24 GB"]),
      ],
    };
    const requirements = setNumeric(emptyRequirements(), "vram_gb", { min: 8 });
    const plan = planRequirements(
      requirements,
      listing,
      emptyQuery(listing.categoryId),
      () => null,
    );
    const model = buildRequirementsViewModel(facetsOf(listing), input({ requirements, plan }));
    const slider = model?.numeric.find((entry) => entry.facet === "vram_gb")?.slider;

    it("slides over the sizes of both groups, leaving Shared Memory out", () => {
      expect(slider).toMatchObject({ kind: "single", min: 4, max: 24, value: 8 });
    });

    it("reports the one group the plan picked", () => {
      expect(slider?.status).toBe("3 options");
      expect(plan.query.filterIds).toEqual(["201", "202", "203"].map(filterId));
    });
  });
});
