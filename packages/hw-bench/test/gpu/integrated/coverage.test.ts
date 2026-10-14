import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type GpuBenchmarkRecord,
  IGPU_RULES,
  integratedGpuOf,
  isIntegratedGpu,
  passmarkGpuSource,
} from "../../../src";
import { dataPath, haveData } from "../../data";

const GPU_CSV = "passmark_gpu.csv";
const LABELS = "idealo-mcp-labels.json";

/** Measured when the table was researched: 236 of the 247 idealo CPU labels; the new rules add six. */
const FLOOR = { covered: 236, total: 247 };

/** CPU labels the table deliberately leaves out: too ambiguous or truncated to name one iGPU. */
const AMBIGUOUS_LABELS = [
  "AMD Athlon",
  "Intel Celeron",
  "Intel Pentium Dual Core",
  "AMD Ryzen 5 40",
] as const;

/** The labels of the owner's coverage review that gained a rule with the table (Xeon, Core 2, Snapdragon 7c, 3020e). */
const NEWLY_COVERED = [
  "Intel Xeon E5-2666 v3",
  "Intel Xeon E5-2678 v3",
  "Intel Xeon W-2125",
  "Intel Core 2 Duo",
  "Qualcomm Snapdragon 7c",
  "AMD 3020e",
] as const;

describe.skipIf(!haveData(GPU_CSV))("iGPU table against the PassMark GPU list", () => {
  let records: GpuBenchmarkRecord[];
  let names: Set<string>;

  beforeAll(() => {
    records = [...passmarkGpuSource.parse(readFileSync(dataPath(GPU_CSV), "utf8")).records];
    names = new Set(records.map((record) => record.name));
  });

  it("names a PassMark row for every rule that claims one", () => {
    const missing = IGPU_RULES.flatMap(({ id, igpu }) =>
      igpu.kind === "passmark" && !names.has(igpu.name) ? [`${id}: ${igpu.name}`] : [],
    );
    expect(missing).toEqual([]);
  });

  it("names no PassMark row for the graphics a rule calls unrated", () => {
    const rated = IGPU_RULES.flatMap(({ id, igpu }) =>
      igpu.kind === "unrated" && names.has(igpu.name) ? [`${id}: ${igpu.name}`] : [],
    );
    expect(rated).toEqual([]);
  });

  it("classifies every table iGPU as integrated and no discrete card family as integrated", () => {
    for (const { igpu } of IGPU_RULES) {
      if (igpu.kind === "passmark") expect(isIntegratedGpu(igpu.name), igpu.name).toBe(true);
    }
    const cards = records.filter((record) =>
      /^(?:GeForce (?:RTX|GTX) |Radeon RX \d|Intel Arc (?:A\d|B5\d{2})|RTX \d{4}|Radeon Pro W)/.test(
        record.name,
      ),
    );
    expect(cards.length).toBeGreaterThan(100);
    expect(cards.filter((record) => isIntegratedGpu(record.name)).map((r) => r.name)).toEqual([]);
  });
});

describe.skipIf(!haveData(GPU_CSV, LABELS))("iGPU table against the idealo CPU labels", () => {
  let labels: string[];

  beforeAll(() => {
    const file = JSON.parse(readFileSync(dataPath(LABELS), "utf8")) as {
      categories: Record<string, { cpu: string[] }>;
    };
    labels = [...new Set(Object.values(file.categories).flatMap((category) => category.cpu))];
  });

  it("covers at least 236 of the 247 labels", () => {
    const unmatched = labels.filter((label) => integratedGpuOf(label) === null);
    const covered = labels.length - unmatched.length;
    expect(labels.length).toBeGreaterThanOrEqual(FLOOR.total);
    expect(covered / labels.length).toBeGreaterThanOrEqual(FLOOR.covered / FLOOR.total);
    expect(covered).toBeGreaterThanOrEqual(FLOOR.covered);
  });

  it("covers the labels that got new rules and leaves the ambiguous ones unmatched", () => {
    for (const label of NEWLY_COVERED) {
      if (labels.includes(label)) expect(integratedGpuOf(label), label).not.toBeNull();
    }
    for (const label of AMBIGUOUS_LABELS) {
      if (labels.includes(label)) expect(integratedGpuOf(label), label).toBeNull();
    }
  });
});
