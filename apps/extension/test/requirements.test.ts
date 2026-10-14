import { passmarkCpuSource, passmarkGpuSource } from "@idealo-hw/hw-bench";
import {
  categoryId,
  type FacetPlan,
  type FilterCatalog,
  type FilterGroup,
  facetsOf,
  filterId,
  RequirementsSchema,
} from "@idealo-hw/idealo-query";
import { describe, expect, it } from "vitest";
import {
  axisOf,
  formatMeasure,
  labelledMarks,
  snapDown,
  snapUp,
} from "../src/requirements/controls";
import { createModelScorer, METRIC, scoreSpan } from "../src/requirements/scorer";
import {
  emptyRequirements,
  isEmpty,
  setCombine,
  setLabels,
  setMinimum,
  setNumeric,
  setPriceRange,
} from "../src/requirements/state";
import { statusLine } from "../src/requirements/status";

const group = (name: string, labels: string[]): FilterGroup => ({
  attributeId: name,
  name,
  filters: labels.map((label, i) => ({ filterId: filterId(String(1000 + i)), label })),
});
const catalog = (...groups: FilterGroup[]): FilterCatalog => ({
  categoryId: categoryId("3751"),
  groups,
  manufacturers: [],
});
const optionsOf = (name: string, labels: string[]) => {
  const [facet] = facetsOf(catalog(group(name, labels)));
  return facet?.kind === "numeric" ? facet.options : [];
};

describe("axisOf", () => {
  it("lists the snap values of a minimum slider from the options' lower ends", () => {
    const options = optionsOf("RAM", ["8 GB", "16 GB", "32 GB", "64 GB", "Shared Memory"]);
    expect(axisOf(options, "min")).toEqual([8, 16, 32, 64]);
  });

  it("reads TB labels as GB and drops the zero of 'bis' labels", () => {
    const options = optionsOf("SSD-Speicher", ["bis 256 GB", "512 GB", "1 TB", "2 TB"]);
    expect(axisOf(options, "min")).toEqual([512, 1000, 2000]);
  });

  it("uses finite upper ends for a maximum slider", () => {
    const options = optionsOf("Gewicht", ["bis 1 kg", "1,4 kg", "1,8 kg", "ab 2,5 kg"]);
    expect(axisOf(options, "max")).toEqual([1, 1.4, 1.8]);
  });

  it("joins both ends for a range, so a bucket ends where the next starts", () => {
    const options = optionsOf("Displaygröße", ["13 Zoll", "14 Zoll", "15 Zoll", "17 Zoll"]);
    expect(axisOf(options, "range")).toEqual([13, 14, 15, 17]);
  });
});

describe("snapping and formatting", () => {
  const axis = [8, 16, 32, 64];
  it("snaps a stored bound to the stricter listed value", () => {
    expect(snapUp(axis, 12)).toBe(16);
    expect(snapUp(axis, 100)).toBe(64);
    expect(snapDown(axis, 20)).toBe(16);
    expect(snapDown(axis, 1)).toBe(8);
  });

  it("formats measures the way idealo writes them", () => {
    expect(formatMeasure(16, "GB")).toBe("16 GB");
    expect(formatMeasure(1000, "GB")).toBe("1 TB");
    expect(formatMeasure(1.4, "kg")).toBe("1,4 kg");
    expect(formatMeasure(2025, "")).toBe("2025");
  });

  it("labels the ends and only the marks that keep their distance", () => {
    const marks = labelledMarks([0, 5, 10, 50, 60, 100], String);
    expect(marks.map((mark) => mark.label ?? null)).toEqual(["0", null, null, "50", null, "100"]);
  });
});

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

describe("createModelScorer", () => {
  const cpus = passmarkCpuSource.parse(
    JSON.stringify({
      data: [
        {
          id: "1",
          name: "Intel Core i7-13700H",
          cpumark: "28,000",
          thread: "3,700",
          cat: "Laptop",
        },
        { id: "2", name: "AMD Ryzen 5 7640U", cpumark: "17,000", thread: "3,500", cat: "Laptop" },
        {
          id: "3",
          name: "Apple M4 Pro 12 Core",
          cpumark: "30,000",
          thread: "4,000",
          cat: "Laptop",
        },
        {
          id: "4",
          name: "Apple M4 Pro 14 Core",
          cpumark: "34,000",
          thread: "4,000",
          cat: "Laptop",
        },
      ],
    }),
  );
  const gpus = passmarkGpuSource.parse(
    [
      "id,name,g3d,g2d,cat,date,rank,samples",
      '1,GeForce RTX 4060 Laptop GPU,"15,000",900,Mobile,Feb 2023,100,10',
      '2,GeForce RTX 4060,"19,000",900,Desktop,Jun 2023,90,10',
    ].join("\n"),
  );

  it("scores a CPU label by its multi- and single-thread marks", () => {
    const scorer = createModelScorer(cpus, null, "laptop");
    expect(scorer("cpu_model", "Intel Core i7-13700H")).toEqual({
      cpu_mark: 28000,
      cpu_single: 3700,
    });
    expect(scorer("cpu_model", "Intel Core i9-99999X")).toBeNull();
  });

  it("scores a family label by its weakest variant", () => {
    const scorer = createModelScorer(cpus, null, "laptop");
    expect(scorer("cpu_model", "Apple M4 Pro")).toMatchObject({ cpu_mark: 30000 });
  });

  it("scores GPUs as the page's device class", () => {
    expect(createModelScorer(null, gpus, "laptop")("gpu_model", "NVIDIA GeForce RTX 4060")).toEqual(
      { g3d: 15000 },
    );
    expect(
      createModelScorer(null, gpus, "desktop")("gpu_model", "NVIDIA GeForce RTX 4060"),
    ).toEqual({ g3d: 19000 });
  });

  it("resolves nothing without imported data", () => {
    const scorer = createModelScorer(null, null, "laptop");
    expect(scorer("cpu_model", "Intel Core i7-13700H")).toBeNull();
    expect(scorer("gpu_model", "NVIDIA GeForce RTX 4060")).toBeNull();
  });

  it("spans the scores of the models a group lists", () => {
    const scorer = createModelScorer(cpus, null, "laptop");
    const listed = group("Prozessor", ["Intel Core i7-13700H", "AMD Ryzen 5 7640U", "Mystery CPU"]);
    expect(scoreSpan(listed, "cpu_model", METRIC.cpuMark, scorer)).toEqual({
      min: 17000,
      max: 28000,
    });
    expect(
      scoreSpan(group("Prozessor", ["Mystery CPU"]), "cpu_model", METRIC.cpuMark, scorer),
    ).toBeNull();
  });
});
