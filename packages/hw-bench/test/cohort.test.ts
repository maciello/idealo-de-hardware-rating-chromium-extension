import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
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
} from "../src";
import { cpuRecord, cpuRow, cpuSnapshotOf } from "./fixtures";

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
    cpuRow({ name: "Old1", cpumark: "500", date: "Feb 2009" }),
    cpuRow({ name: "Old2", cpumark: "800", date: "Feb 2010" }),
    cpuRow({ name: "New1", cpumark: "10,000", date: "Mar 2024" }),
    cpuRow({ name: "New2", cpumark: "20,000", date: "Mar 2025" }),
  );
  const cpu = cpuRecord({ cpuMark: 15_000, segments: ["desktop"] });

  it("ranks against recent CPUs by default and names the cutoff", () => {
    const rating = segmentPercentile(snapshot).rate({ cpu });
    expect(rating?.value).toBe(50);
    expect(rating?.explanation).toContain("first seen 2021 or later");
  });

  it("reproduces the full-history ranking with no cutoff", () => {
    const none: CohortPolicy = { yearCutoff: { kind: "none" }, minScore: null };
    expect(segmentPercentile(snapshot, none).rate({ cpu })?.value).toBe(75);
  });
});

const dataDir = resolve(import.meta.dirname, "../../../data");
const cpuPath = resolve(dataDir, "passmark_cpu.json");
const gpuPath = resolve(dataDir, "passmark_gpu.csv");
const NO_CUTOFF: CohortPolicy = { yearCutoff: { kind: "none" }, minScore: null };

describe.skipIf(!existsSync(cpuPath) || !existsSync(gpuPath))(
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
      expect(midAll).toBeGreaterThan(80);
      expect(midRecent).toBeLessThan(65);
      expect(rate("AMD Ryzen 9 9950X", DEFAULT_COHORT_POLICY)).toBeGreaterThan(90);
    });

    it("ranks CPUs against the pool of the page's device class, not PassMark's first segment", () => {
      const snapshot = passmarkCpuSource.parse(readFileSync(cpuPath, "utf8"));
      const strategy = segmentPercentile(snapshot, DEFAULT_COHORT_POLICY);
      const cpuNamed = (name: string) => {
        const cpu = snapshot.records.find((r) => r.name === name && r.socketCount === 1);
        if (cpu === undefined) throw new Error(`${name} missing from snapshot`);
        return cpu;
      };
      const ryzen = cpuNamed("AMD Ryzen AI 7 445");
      expect(ryzen.segments[0]).toBe("desktop");
      const own = strategy.rate({ cpu: ryzen });
      const laptop = strategy.rate({ cpu: ryzen, formFactor: "laptop" });
      expect(own?.explanation).toContain("desktop CPUs");
      expect(laptop?.explanation).toContain("laptop CPUs");
      expect(laptop?.value).toBeGreaterThan(own?.value ?? Number.NaN);

      const celeron = cpuNamed("Intel Celeron N5095 @ 2.00GHz");
      expect(strategy.rate({ cpu: celeron, formFactor: "laptop" })?.explanation).toContain(
        "laptop CPUs",
      );
      const ultra = cpuNamed("Intel Core Ultra 9 285H");
      expect(strategy.rate({ cpu: ultra, formFactor: "desktop" })?.explanation).toContain(
        "desktop CPUs",
      );
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
