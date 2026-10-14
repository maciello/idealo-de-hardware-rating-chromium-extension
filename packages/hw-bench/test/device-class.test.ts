import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyCpu,
  classifyGpu,
  createCanonicalKeyMatcher,
  createCohort,
  createGpuMatcher,
  DEFAULT_COHORT_POLICY,
  type DeviceMembership,
  passmarkCpuSource,
  passmarkGpuSource,
} from "../src";

type Expected = "laptop" | "desktop" | "both" | "excluded" | "unclassified";

const shape = (membership: DeviceMembership): Expected => {
  if (membership.laptop && membership.desktop) return "both";
  if (membership.laptop) return "laptop";
  if (membership.desktop) return "desktop";
  return membership.status === "excluded" ? "excluded" : "unclassified";
};

/** Named exemplars; "laptop" = LaptopCpu only, "desktop" = DesktopCpu only, "both" = in the two sets (ships in both). */
const CPU_TABLE: readonly (readonly [string, Expected])[] = [
  ["Intel Core i5-1335U", "both"],
  ["Intel Core Ultra 7 155H", "both"],
  ["AMD Ryzen 7 7840HS", "both"],
  ["Apple M3 8 Core", "both"],
  ["Intel Celeron N4500", "both"],
  ["Intel N100", "both"],
  ["Intel Core 9 270H", "both"],
  ["Intel Core Ultra X7 358H", "both"],
  ["Intel Core Ultra 7 270K Plus", "desktop"],
  ["AMD Ryzen 9 9950X3D2", "desktop"],
  ["Intel Core i7-12700H", "both"],
  ["AMD Ryzen AI 9 HX 370", "both"],
  ["Qualcomm Snapdragon X Elite - X1E-80-100", "laptop"],
  ["Snapdragon 8cx Gen 3 @ 3.0 GHz", "laptop"],
  ["Mediatek Kompanio 540", "laptop"],
  ["Apple A18 Pro", "laptop"],
  ["Intel Core i5-13400", "desktop"],
  ["Intel Core i9-13900KF", "desktop"],
  ["AMD Ryzen 7 7800X3D", "desktop"],
  ["AMD Ryzen 5 5600G", "desktop"],
  ["AMD Ryzen Threadripper 7960X", "desktop"],
  ["Intel Xeon W-2295", "desktop"],
  ["Apple M3 Ultra 32 Core", "desktop"],
  ["Intel Atom x7425E", "desktop"],
  ["NVIDIA GB10", "desktop"],
  ["Qualcomm Snapdragon 8 Gen 3", "excluded"],
  ["Mediatek Dimensity 9300 (MT6989)", "excluded"],
  ["Apple A17 Pro", "excluded"],
  ["Google Tensor G3", "excluded"],
  ["AMD Ryzen Embedded R1606G", "excluded"],
  ["AMD EPYC 9654", "excluded"],
  ["Intel Xeon Gold 6338", "excluded"],
  ["Intel Atom C3758 @ 2.20GHz", "excluded"],
  ["Intel Core i5-10500E @ 3.10GHz", "excluded"],
  ["ARM Cortex-A72 4 Core 1800 MHz", "excluded"],
  ["Virtual @ 2.30GHz", "excluded"],
  ["ARM Apple M1 (Virtual) 4 Core 0 MHz", "excluded"],
  ["Hygon C86 3185 8-core", "excluded"],
];

const GPU_TABLE: readonly (readonly [string, Expected])[] = [
  ["GeForce RTX 4060 Laptop GPU", "laptop"],
  ["Radeon RX 7600M XT", "laptop"],
  ["GeForce MX550", "laptop"],
  ["GeForce RTX 2050", "laptop"],
  ["Intel Arc A730M", "laptop"],
  ["RTX A2000 8GB Laptop GPU", "laptop"],
  ["Quadro RTX 3000", "laptop"],
  ["Qualcomm Adreno X1-85", "laptop"],
  ["Intel Iris Xe", "both"],
  ["Radeon 780M", "both"],
  ["Intel Arc 140V GPU", "both"],
  ["Intel UHD Graphics 630", "both"],
  ["Radeon 610M Ryzen 5 7645HX", "both"],
  ["NVIDIA T1000 8GB", "both"],
  ["GeForce RTX 4090", "desktop"],
  ["Radeon RX 7900 XTX", "desktop"],
  ["Intel Arc A770", "desktop"],
  ["Intel UHD Graphics 770", "desktop"],
  ["RTX A4000", "desktop"],
  ["RTX PRO 4500 Blackwell", "desktop"],
  ["Radeon AI PRO R9700", "desktop"],
  ["NVIDIA GB10 Blackwell GPU", "desktop"],
  ["A40-12Q", "excluded"],
  ["GRID P40-8Q", "excluded"],
  ["NVIDIA A100-SXM4-40GB", "excluded"],
  ["NVIDIA L4", "excluded"],
  ["Microsoft Basic Render Driver", "excluded"],
  ["DisplayLink USB Device Ryzen 5 5625U", "excluded"],
  ["Qualcomm Adreno 740", "excluded"],
  ["ARM Mali-G78", "excluded"],
  ["RTX PRO 4500 Blackwell Server Edition", "excluded"],
  ["Radeon EPYC 4364P", "excluded"],
];

describe("classifyCpu exemplars", () => {
  it.each(CPU_TABLE)("%s is %s", (name, expected) => {
    expect(shape(classifyCpu(name))).toBe(expected);
  });

  it("covers every class with at least 3 members and 3 non-members", () => {
    for (const set of ["laptop", "desktop"] as const) {
      const members = CPU_TABLE.filter(([name]) => classifyCpu(name)[set]);
      expect(members.length).toBeGreaterThanOrEqual(3);
      expect(CPU_TABLE.length - members.length).toBeGreaterThanOrEqual(3);
    }
    expect(
      CPU_TABLE.filter(([, expected]) => expected === "excluded").length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("never reads PassMark's category: membership is a function of the name", () => {
    expect(classifyCpu("Intel Celeron N5095 @ 2.00GHz")).toEqual(
      classifyCpu("Intel Celeron N5095"),
    );
  });

  it("says why a chip is in no set: excluded by a named rule, or unclassified", () => {
    expect(classifyCpu("AMD EPYC 9654")).toMatchObject({ status: "excluded", rule: "server" });
    expect(classifyCpu("Testcorp Core X1-1000")).toEqual({
      laptop: false,
      desktop: false,
      status: "unclassified",
      rule: "none",
    });
    expect(classifyCpu("Intel Core i5-1335U")).toMatchObject({ status: "member" });
  });
});

describe("classifyGpu exemplars", () => {
  it.each(GPU_TABLE)("%s is %s", (name, expected) => {
    expect(shape(classifyGpu(name))).toBe(expected);
  });

  it("covers every class with at least 3 members and 3 non-members", () => {
    for (const set of ["laptop", "desktop"] as const) {
      const members = GPU_TABLE.filter(([name]) => classifyGpu(name)[set]);
      expect(members.length).toBeGreaterThanOrEqual(3);
      expect(GPU_TABLE.length - members.length).toBeGreaterThanOrEqual(3);
    }
    expect(
      GPU_TABLE.filter(([, expected]) => expected === "excluded").length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("makes an iGPU named after its CPU follow that CPU", () => {
    expect(classifyGpu("Radeon 610M Ryzen 9 7945HX")).toMatchObject({
      laptop: true,
      desktop: true,
    });
    expect(classifyGpu("Radeon Ryzen 5 5600G")).toMatchObject({ laptop: false, desktop: true });
  });
});

const dataDir = resolve(import.meta.dirname, "../../../data");
const cpuPath = resolve(dataDir, "passmark_cpu.json");
const gpuPath = resolve(dataDir, "passmark_gpu.csv");
const haveData = existsSync(cpuPath) && existsSync(gpuPath);

/**
 * Every record of the universe U (single-socket, passes the default year cutoff) lands in exactly one of
 * {laptop only, desktop only, both, excluded, unclassified}. The ceilings are ratchets: lower them when rules improve.
 * Measured on PassMark 2026-10: CPU 67/1867 unclassified (3.6%), GPU 60/806 (7.4%).
 */
const UNCLASSIFIED_CEILING = { cpu: 0.05, gpu: 0.1 };

describe.skipIf(!haveData)("device classes over PassMark data", () => {
  const cpus = passmarkCpuSource.parse(readFileSync(cpuPath, "utf8"));
  const gpus = passmarkGpuSource.parse(readFileSync(gpuPath, "utf8"));

  const account = <R extends { name: string }>(
    universe: readonly R[],
    classify: (name: string) => DeviceMembership,
  ) => {
    const count = { laptopOnly: 0, desktopOnly: 0, both: 0, excluded: 0, unclassified: 0 };
    for (const { name } of universe) {
      const m = classify(name);
      if (m.status === "excluded") {
        expect(m.laptop || m.desktop).toBe(false);
        count.excluded++;
      } else if (m.status === "unclassified") {
        expect(m.laptop || m.desktop).toBe(false);
        count.unclassified++;
      } else {
        expect(m.laptop || m.desktop).toBe(true);
        if (m.laptop && m.desktop) count.both++;
        else if (m.laptop) count.laptopOnly++;
        else count.desktopOnly++;
      }
    }
    return count;
  };
  const total = (count: Record<string, number>) => Object.values(count).reduce((a, b) => a + b, 0);

  it("accounts for every CPU of U and keeps the unclassified share under its ceiling", () => {
    const cohort = createCohort(cpus.records, (r) => r.cpuMark, DEFAULT_COHORT_POLICY);
    const universe = cpus.records.filter((r) => r.socketCount === 1 && cohort.includes(r));
    const count = account(universe, classifyCpu);
    expect(total(count)).toBe(universe.length);
    expect(count.unclassified / universe.length).toBeLessThanOrEqual(UNCLASSIFIED_CEILING.cpu);
    expect(count.laptopOnly + count.both).toBeGreaterThan(100);
    expect(count.desktopOnly + count.both).toBeGreaterThan(100);
  });

  it("accounts for every GPU of U and keeps the unclassified share under its ceiling", () => {
    const cohort = createCohort(gpus.records, (r) => r.g3dMark, DEFAULT_COHORT_POLICY);
    const universe = gpus.records.filter((r) => cohort.includes(r));
    const count = account(universe, classifyGpu);
    expect(total(count)).toBe(universe.length);
    expect(count.unclassified / universe.length).toBeLessThanOrEqual(UNCLASSIFIED_CEILING.gpu);
    expect(count.laptopOnly + count.both).toBeGreaterThan(100);
    expect(count.desktopOnly + count.both).toBeGreaterThan(100);
  });

  it("puts known notebook and PC chips in the sets a buyer on idealo finds them in", () => {
    const names = (set: "laptop" | "desktop") =>
      new Set(cpus.records.filter((r) => classifyCpu(r.name)[set]).map((r) => r.name));
    expect(names("laptop")).toContain("Intel Core i5-1235U");
    expect(names("desktop")).toContain("Intel Core i5-13400");
    expect(names("laptop")).not.toContain("Intel Core i5-13400");
    expect(names("desktop")).not.toContain("AMD EPYC 9654");
    expect(names("laptop")).not.toContain("AMD EPYC 9654");
  });
});

/**
 * Yardstick over idealo's own market (local MCP data, never committed; ADR 0013): the Prozessor and Grafikkarte filter
 * labels of the Notebooks (3751) and PC-Systeme (3020) listings, each weighted by its product count. Point
 * IDEALO_MCP_DIR at a directory holding search-3751.json and search-3020.json. Labels the matcher cannot resolve
 * to a record (or only ambiguously to records not all in the set) are reported by the share, not counted as hits.
 * Umbrella GPU labels ("Intel Graphics", "AMD Radeon Graphics") name no card and need the product's CPU: they are
 * skipped here (`needs_cpu_context`), neither hits nor misses.
 */
const mcpDir = process.env.IDEALO_MCP_DIR;
const searchFile = (category: string): string | null =>
  mcpDir === undefined ? null : resolve(mcpDir, `search-${category}.json`);
const haveMcp =
  searchFile("3751") !== null &&
  existsSync(searchFile("3751") ?? "") &&
  existsSync(searchFile("3020") ?? "");

interface Label {
  readonly content: string;
  readonly amount: number;
}

const labelsOf = (category: string, group: string): readonly Label[] => {
  const file = searchFile(category);
  if (file === null) return [];
  const data = JSON.parse(readFileSync(file, "utf8")) as {
    availableFilters: { name: string; filters: Label[] }[];
  };
  return data.availableFilters.find((filter) => filter.name === group)?.filters ?? [];
};

const UMBRELLA_GPU =
  /^(?:intel graphics|intel arc graphics|amd radeon graphics|intel uhd graphics|intel hd graphics|intel iris xe graphics|intel iris graphics|apple m\d.*graphics|radeon graphics)$/i;

describe.skipIf(!haveData || !haveMcp)("idealo market yardstick", () => {
  const cpuMatcher = createCanonicalKeyMatcher(
    passmarkCpuSource.parse(readFileSync(cpuPath, "utf8")),
  );
  const gpuMatcher = createGpuMatcher(passmarkGpuSource.parse(readFileSync(gpuPath, "utf8")));
  const MIN_SHARE = 0.97;

  const share = (
    labels: readonly Label[],
    resolveRecords: (label: string) => readonly string[],
    classify: (name: string) => DeviceMembership,
    set: "laptop" | "desktop",
  ) => {
    let matched = 0;
    let inSet = 0;
    let resolvable = 0;
    let total = 0;
    for (const { content, amount } of labels) {
      total += amount;
      const names = resolveRecords(content);
      if (names.length === 0) continue;
      resolvable += amount;
      matched += amount;
      if (names.every((name) => classify(name)[set])) inSet += amount;
    }
    return { matched, inSet, resolvable, total };
  };

  const cpuNames = (label: string): readonly string[] => {
    const result = cpuMatcher.matchText(label);
    if (result.status === "matched") return [result.record.name];
    return result.status === "ambiguous" ? result.candidates.map((r) => r.name) : [];
  };
  const gpuNames =
    (formFactor: "laptop" | "desktop") =>
    (label: string): readonly string[] => {
      if (UMBRELLA_GPU.test(label.trim())) return [];
      const result = gpuMatcher.match(label, { formFactor });
      if (result.status === "matched") return [result.record.name];
      return result.status === "ambiguous" ? result.candidates.map((r) => r.name) : [];
    };

  it("holds at least 97% of matched notebook CPUs in LaptopCpu", () => {
    const r = share(labelsOf("3751", "Prozessor"), cpuNames, classifyCpu, "laptop");
    expect(r.matched / r.total).toBeGreaterThan(0.5);
    expect(r.inSet / r.matched).toBeGreaterThanOrEqual(MIN_SHARE);
  });

  it("holds at least 97% of matched PC CPUs in DesktopCpu", () => {
    const r = share(labelsOf("3020", "Prozessor"), cpuNames, classifyCpu, "desktop");
    expect(r.matched / r.total).toBeGreaterThan(0.5);
    expect(r.inSet / r.matched).toBeGreaterThanOrEqual(MIN_SHARE);
  });

  it("holds at least 97% of matched notebook GPUs in LaptopGpu", () => {
    const r = share(labelsOf("3751", "Grafikkarte"), gpuNames("laptop"), classifyGpu, "laptop");
    expect(r.matched).toBeGreaterThan(0);
    expect(r.inSet / r.matched).toBeGreaterThanOrEqual(MIN_SHARE);
  });

  it("holds at least 97% of matched PC GPUs in DesktopGpu", () => {
    const r = share(labelsOf("3020", "Grafikkarte"), gpuNames("desktop"), classifyGpu, "desktop");
    expect(r.matched).toBeGreaterThan(0);
    expect(r.inSet / r.matched).toBeGreaterThanOrEqual(MIN_SHARE);
  });
});
