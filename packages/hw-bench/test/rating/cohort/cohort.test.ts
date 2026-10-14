import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  type CohortPolicy,
  CohortPolicySchema,
  createCohort,
  DEFAULT_COHORT_POLICY,
  passmarkCpuSource,
  passmarkGpuSource,
  percentileRank,
  segmentPercentile,
} from "../../../src";
import { dataPath, haveData } from "../../data";
import { cpuRecord, cpuRow, cpuSnapshotOf } from "../../fixtures";

const dated = (year: number | null, score: number) => ({
  released: year === null ? null : { year, month: 6 },
  score,
});
type Dated = ReturnType<typeof dated>;
const records: readonly Dated[] = [
  dated(2009, 300),
  dated(2016, 4_000),
  dated(2021, 1_500),
  dated(2024, 9_000),
  dated(null, 7_000),
];
const admitted = (policy: CohortPolicy) => {
  const cohort = createCohort(records, (r) => r.score, policy);
  return records.filter((r) => cohort.includes(r)).map((r) => r.score);
};

describe("createCohort", () => {
  it("admits everything without cutoffs", () => {
    expect(admitted({ yearCutoff: { kind: "none" }, minScore: null })).toHaveLength(5);
  });

  it("since_year keeps dated records from that year on and drops undated ones", () => {
    expect(admitted({ yearCutoff: { kind: "since_year", year: 2016 }, minScore: null })).toEqual([
      4_000, 1_500, 9_000,
    ]);
  });

  it("rolling counts calendar years back from the newest record, inclusive", () => {
    const cohort = createCohort(records, (r) => r.score, {
      yearCutoff: { kind: "rolling", years: 4 },
      minScore: null,
    });
    expect(cohort.sinceYear).toBe(2021);
    expect(admitted({ yearCutoff: { kind: "rolling", years: 4 }, minScore: null })).toEqual([
      1_500, 9_000,
    ]);
  });

  it("minScore combines with the year cutoff", () => {
    expect(admitted({ yearCutoff: { kind: "none" }, minScore: 4_000 })).toEqual([
      4_000, 9_000, 7_000,
    ]);
    expect(admitted({ yearCutoff: { kind: "since_year", year: 2016 }, minScore: 2_000 })).toEqual([
      4_000, 9_000,
    ]);
  });
});

describe("CohortPolicySchema", () => {
  it("accepts the default and rejects nonsense", () => {
    expect(CohortPolicySchema.parse(DEFAULT_COHORT_POLICY)).toEqual(DEFAULT_COHORT_POLICY);
    expect(
      CohortPolicySchema.safeParse({ yearCutoff: { kind: "rolling", years: 0 }, minScore: null })
        .success,
    ).toBe(false);
    expect(
      CohortPolicySchema.safeParse({ yearCutoff: { kind: "none" }, minScore: -1 }).success,
    ).toBe(false);
  });
});

describe("segmentPercentile with a cohort", () => {
  const snapshot = cpuSnapshotOf(
    cpuRow({ name: "Intel Core i5-3470", cpumark: "500", date: "Feb 2009" }),
    cpuRow({ name: "Intel Core i5-4570", cpumark: "800", date: "Feb 2010" }),
    cpuRow({ name: "Intel Core i5-13400", cpumark: "10,000", date: "Mar 2024" }),
    cpuRow({ name: "Intel Core i7-14700K", cpumark: "20,000", date: "Mar 2025" }),
  );
  const cpu = cpuRecord({ name: "Intel Core i5-12400", cpuMark: 15_000, segments: ["desktop"] });

  it("ranks against recent CPUs by default and names the cutoff", () => {
    const rating = segmentPercentile(snapshot).rate({ cpu });
    expect(rating?.value).toBe(50);
    expect(rating).toMatchObject({ cohort: { sinceYear: 2021, minScore: null } });
  });

  it("reproduces the full-history ranking with no cutoff", () => {
    const none: CohortPolicy = { yearCutoff: { kind: "none" }, minScore: null };
    expect(segmentPercentile(snapshot, none).rate({ cpu })?.value).toBe(75);
  });
});

const cpuPath = dataPath("passmark_cpu.json");
const gpuPath = dataPath("passmark_gpu.csv");
const NO_CUTOFF: CohortPolicy = { yearCutoff: { kind: "none" }, minScore: null };

describe.skipIf(!haveData("passmark_cpu.json", "passmark_gpu.csv"))(
  "default cohort on PassMark data",
  () => {
    it("spreads mainstream desktop CPUs instead of crowding them near the top", () => {
      const snapshot = passmarkCpuSource.parse(readFileSync(cpuPath, "utf8"));
      const rate = (name: string, policy: CohortPolicy) => {
        const cpu = snapshot.records.find((r) => r.name === name && r.socketCount === 1);
        if (cpu === undefined) throw new Error(`${name} missing from snapshot`);
        return segmentPercentile(snapshot, policy).rate({ cpu })?.value ?? Number.NaN;
      };
      const midAll = rate("Intel Core i5-13400", NO_CUTOFF);
      const midRecent = rate("Intel Core i5-13400", DEFAULT_COHORT_POLICY);
      expect(midAll).toBeGreaterThan(midRecent + 15);
      expect(midRecent).toBeLessThan(65);
      expect(rate("AMD Ryzen 9 9950X", DEFAULT_COHORT_POLICY)).toBeGreaterThan(90);
    });

    it("keeps a mid CPU (CPU Mark 8000-17000) in the bottom 40 percent of either class", () => {
      // Owner requirement: a mid CPU must not look good. The extension meter fills ceil(percentile / 20) of 5 bars.
      const snapshot = passmarkCpuSource.parse(readFileSync(cpuPath, "utf8"));
      const strategy = segmentPercentile(snapshot, DEFAULT_COHORT_POLICY);
      const base = snapshot.records.find((r) => r.socketCount === 1);
      if (base === undefined) throw new Error("no single-socket CPU in snapshot");
      for (const formFactor of ["laptop", "desktop"] as const) {
        const at = (cpuMark: number) =>
          strategy.rate({ cpu: { ...base, cpuMark }, formFactor })?.value ?? Number.NaN;
        expect(at(8_000)).toBeLessThanOrEqual(20);
        expect(at(17_000)).toBeLessThanOrEqual(40);
      }
    });

    it("ranks CPUs against the set of the page's device class, not PassMark's first segment", () => {
      const snapshot = passmarkCpuSource.parse(readFileSync(cpuPath, "utf8"));
      const strategy = segmentPercentile(snapshot, DEFAULT_COHORT_POLICY);
      const cpuNamed = (name: string) => {
        const cpu = snapshot.records.find((r) => r.name === name && r.socketCount === 1);
        if (cpu === undefined) throw new Error(`${name} missing from snapshot`);
        return cpu;
      };
      const ryzen = cpuNamed("AMD Ryzen AI 7 445");
      expect(ryzen.segments[0]).toBe("desktop");
      const laptop = strategy.rate({ cpu: ryzen, formFactor: "laptop" });
      const desktop = strategy.rate({ cpu: ryzen, formFactor: "desktop" });
      expect(laptop).toMatchObject({ group: "laptop" });
      expect(desktop).toMatchObject({ group: "desktop" });
      expect(laptop?.value).toBeGreaterThan(desktop?.value ?? Number.NaN);
      // A chip that ships in both classes has no class of its own: no rating without a page form factor.
      expect(strategy.rate({ cpu: ryzen })).toBeNull();

      const celeron = cpuNamed("Intel Celeron N5095 @ 2.00GHz");
      expect(strategy.rate({ cpu: celeron, formFactor: "laptop" })).toMatchObject({
        group: "laptop",
      });
      const ultra = cpuNamed("Intel Core Ultra 9 285H");
      expect(strategy.rate({ cpu: ultra, formFactor: "desktop" })).toMatchObject({
        group: "desktop",
      });
    });

    it("applies to GPU records the same way", () => {
      const snapshot = passmarkGpuSource.parse(readFileSync(gpuPath, "utf8"));
      const rtx4060 = snapshot.records.find((r) => r.name === "GeForce RTX 4060");
      if (rtx4060 === undefined) throw new Error("GeForce RTX 4060 missing from snapshot");
      const percentile = (policy: CohortPolicy) => {
        const cohort = createCohort(snapshot.records, (r) => r.g3dMark, policy);
        const marks = snapshot.records
          .filter((r) => cohort.includes(r))
          .map((r) => r.g3dMark)
          .sort((a, b) => a - b);
        return percentileRank(marks, rtx4060.g3dMark) ?? Number.NaN;
      };
      expect(percentile(NO_CUTOFF)).toBeGreaterThan(percentile(DEFAULT_COHORT_POLICY) + 5);
    });
  },
);
