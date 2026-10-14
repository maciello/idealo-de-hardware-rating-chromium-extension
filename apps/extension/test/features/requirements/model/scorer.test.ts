import { passmarkCpuSource, passmarkGpuSource } from "@idealo-hw/hw-bench";
import { METRIC } from "@idealo-hw/idealo-query";
import { describe, expect, it } from "vitest";
import { createModelScorer, scoreSpan } from "../../../../src/features/requirements/model";
import { group } from "../catalog-fixtures";

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
