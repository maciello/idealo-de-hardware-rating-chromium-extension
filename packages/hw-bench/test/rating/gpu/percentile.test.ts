import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_COHORT_POLICY,
  type FormFactor,
  type GpuBenchmarkRecord,
  gpuPercentile,
} from "../../../src";
import { NO_CUTOFF, recordNamed, type Spec, snapshotOf, specs } from "./fixtures";

describe("gpuPercentile sets", () => {
  const snapshot = snapshotOf(...specs);
  const strategy = gpuPercentile(snapshot);
  const rtx9060Laptop = recordNamed(specs, "GeForce RTX 9060 Laptop GPU");
  const rtx9060 = recordNamed(specs, "GeForce RTX 9060");
  const rate = (gpu: GpuBenchmarkRecord, formFactor?: FormFactor) =>
    strategy.rate(formFactor === undefined ? { gpu } : { gpu, formFactor });

  it("ranks against LaptopGpu for a laptop page, integrated included, and names that set", () => {
    const rating = rate(rtx9060Laptop, "laptop");
    // set [2500, 6700, 16000, 26000]: 16000 beats two and counts itself, inclusive: 3 / 4.
    expect(rating?.value).toBe(75);
    expect(rating).toMatchObject({ group: "laptop", sampleSize: 4, cohort: { sinceYear: 2020 } });
  });

  it("ranks against DesktopGpu for a desktop page, without laptop discrete cards", () => {
    const rating = rate(rtx9060, "desktop");
    // set [1900, 2500, 6700, 19000, 30000, 36000]: 19000 beats three and counts itself: 4 / 6.
    expect(rating?.value).toBeCloseTo((4 / 6) * 100, 9);
    expect(rating).toMatchObject({ group: "desktop", sampleSize: 6 });
  });

  it("lets the page decide the set, not the record", () => {
    const asLaptop = rate(rtx9060, "laptop");
    const asDesktop = rate(rtx9060, "desktop");
    expect(asLaptop).toMatchObject({ group: "laptop" });
    expect(asDesktop).toMatchObject({ group: "desktop" });
    expect(asLaptop?.value).not.toBe(asDesktop?.value);
  });

  it("counts an iGPU that ships in both classes once in each set and a desktop-only iGPU in DesktopGpu only", () => {
    const iris = recordNamed(specs, "Intel Iris Xe");
    const uhd = recordNamed(specs, "Intel UHD Graphics 770");
    expect(rate(iris, "laptop")).toMatchObject({ group: "laptop", sampleSize: 4 });
    expect(rate(iris, "desktop")).toMatchObject({ group: "desktop", sampleSize: 6 });
    expect(rate(uhd, "laptop")).toMatchObject({ group: "laptop", sampleSize: 4 });
    expect(rate(uhd, "desktop")?.value).toBeCloseTo((1 / 6) * 100, 9);
  });

  it("keeps virtual and vGPU records out of both sets, yet rates them when the page asks", () => {
    const vgpu = recordNamed(specs, "A40-12Q");
    expect(rate(vgpu, "laptop")).toMatchObject({ group: "laptop", sampleSize: 4 });
    expect(rate(vgpu, "desktop")).toMatchObject({ group: "desktop", sampleSize: 6 });
  });

  it("rates nothing without a known form factor", () => {
    expect(rate(rtx9060Laptop)).toBeNull();
    expect(rate(rtx9060Laptop, "unknown")).toBeNull();
  });

  it("applies the cohort policy to both sets", () => {
    const old = recordNamed(specs, "GeForce GTX 1050 Laptop GPU");
    const recent = rate(old, "laptop");
    expect(recent?.value).toBe(25);
    const all = gpuPercentile(snapshot, NO_CUTOFF).rate({ gpu: old, formFactor: "laptop" });
    expect(all).toMatchObject({ group: "laptop", sampleSize: 5, cohort: { sinceYear: null } });
    expect(all?.value).toBe(40);
  });

  it("returns null when no record belongs to the page's set", () => {
    const onlyVirtual = gpuPercentile(snapshotOf(specs[9] as Spec));
    expect(onlyVirtual.rate({ gpu: rtx9060, formFactor: "desktop" })).toBeNull();
    expect(onlyVirtual.rate({ gpu: rtx9060, formFactor: "laptop" })).toBeNull();
  });

  it("uses the default policy unless told otherwise", () => {
    const explicit = gpuPercentile(snapshot, DEFAULT_COHORT_POLICY);
    expect(explicit.rate({ gpu: rtx9060Laptop, formFactor: "laptop" })).toEqual(
      rate(rtx9060Laptop, "laptop"),
    );
  });

  it("is monotone in the G3D Mark within a set", () => {
    const cohortScores = fc.array(fc.integer({ min: 1, max: 60_000 }), {
      minLength: 1,
      maxLength: 40,
    });
    fc.assert(
      fc.property(
        cohortScores,
        fc.constantFrom<"laptop" | "desktop">("laptop", "desktop"),
        fc.integer({ min: 1, max: 60_000 }),
        fc.integer({ min: 1, max: 60_000 }),
        (scores, formFactor, a, b) => {
          const cat = formFactor === "laptop" ? "Mobile" : "Desktop";
          const card = (n: number) =>
            formFactor === "laptop" ? `GeForce RTX ${n} Laptop GPU` : `GeForce RTX ${n}`;
          const cohortSnapshot = snapshotOf(
            ...scores.map((g3d, i) => ({ name: card(1000 + i), cat, g3d })),
            { name: card(9998), cat, g3d: Math.min(a, b) },
            { name: card(9999), cat, g3d: Math.max(a, b) },
          );
          const [low, high] = [card(9998), card(9999)].map((name) => {
            const gpu = cohortSnapshot.records.find((r) => r.name === name);
            if (gpu === undefined) throw new Error("probe missing");
            return gpuPercentile(cohortSnapshot).rate({ gpu, formFactor })?.value ?? Number.NaN;
          });
          expect(low).toBeLessThanOrEqual(high as number);
        },
      ),
    );
  });
});
