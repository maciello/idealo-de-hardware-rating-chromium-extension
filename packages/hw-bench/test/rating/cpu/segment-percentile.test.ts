import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { segmentPercentile } from "../../../src";
import { cpuRecord, cpuRow, cpuSnapshotOf } from "../../fixtures";

/** Real chip names with invented marks: pool membership comes from the name (see device-class), not from PassMark's `cat`. */
const named = (name: string, cpumark: string, extra: Record<string, unknown> = {}) =>
  cpuRow({ name, cpumark, ...extra });

describe("segmentPercentile", () => {
  const snapshot = cpuSnapshotOf(
    named("Intel Core i5-13400", "1,000"),
    named("Intel Core i7-13700K", "2,000"),
    named("AMD Ryzen 7 7800X3D", "3,000"),
    named("Intel Core i9-13900KF", "4,000"),
    // Ships in notebooks and mini PCs: in both sets.
    named("Intel Core i7-1255U", "500"),
    named("AMD Ryzen 7 7840HS", "1,500"),
    // Notebook-only.
    named("Qualcomm Snapdragon X Elite - X1E-80-100", "2,500"),
    // Out of both sets: server, phone, and a multi-socket result of a desktop chip.
    named("AMD EPYC 7763", "90,000"),
    named("Mediatek Dimensity 9300 (MT6989)", "95,000"),
    named("Intel Core i9-13900K", "99,000", { cpuCount: "2" }),
  );
  const strategy = segmentPercentile(snapshot);
  // desktop set [500, 1000, 1500, 2000, 3000, 4000], laptop set [500, 1500, 2500]

  const rateNamed = (
    name: string,
    cpuMark: number,
    formFactor?: "laptop" | "desktop" | "unknown",
  ) =>
    strategy.rate({
      cpu: cpuRecord({ name, cpuMark }),
      ...(formFactor === undefined ? {} : { formFactor }),
    });

  it("ranks a chip of exactly one class within that class, without a page form factor", () => {
    expect(rateNamed("Intel Core i5-12400", 2_500)).toMatchObject({
      strategyId: "segment_percentile",
      value: (4 / 6) * 100,
    });
    expect(rateNamed("Qualcomm Snapdragon X Elite - X1E-78-100", 2_000)?.value).toBeCloseTo(
      (2 / 3) * 100,
      9,
    );
    expect(rateNamed("Intel Core i5-12400", 100_000)?.value).toBe(100);
  });

  it("gives no rating to a chip in both classes, in neither, or unparsable without a page form factor", () => {
    expect(rateNamed("AMD Ryzen 7 7735HS", 2_000)).toBeNull();
    expect(rateNamed("AMD EPYC 9654", 2_000)).toBeNull();
    expect(rateNamed("Testcorp Core X1-1000", 2_000)).toBeNull();
  });

  it("lets the page decide the class, whatever the rated chip is", () => {
    const laptop = rateNamed("AMD EPYC 9654", 2_000, "laptop");
    const desktop = rateNamed("AMD EPYC 9654", 2_000, "desktop");
    expect(laptop?.value).toBeCloseTo((2 / 3) * 100, 9);
    expect(laptop).toMatchObject({ group: "laptop", sampleSize: 3 });
    expect(desktop?.value).toBeCloseTo((4 / 6) * 100, 9);
    expect(desktop).toMatchObject({ group: "desktop", sampleSize: 6 });
    expect(rateNamed("AMD EPYC 9654", 2_000, "unknown")).toBeNull();
  });

  it("keeps server, phone and multi-socket results out of both pools", () => {
    expect(rateNamed("Intel Core i5-12400", 100_000, "laptop")?.value).toBe(100);
    expect(rateNamed("Intel Core i5-12400", 100_000, "desktop")?.value).toBe(100);
    expect(rateNamed("Intel Core i5-12400", 5_000, "desktop")).toMatchObject({ sampleSize: 6 });
  });

  it("returns null when the snapshot has no member of the page's class", () => {
    const serverOnly = segmentPercentile(cpuSnapshotOf(named("AMD EPYC 7763", "90,000")));
    expect(serverOnly.rate({ cpu: cpuRecord(), formFactor: "laptop" })).toBeNull();
    expect(serverOnly.rate({ cpu: cpuRecord(), formFactor: "desktop" })).toBeNull();
  });

  it("is monotonic and bounded for any CPU Mark", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 150_000 }),
        fc.integer({ min: 0, max: 150_000 }),
        fc.constantFrom<"laptop" | "desktop">("laptop", "desktop"),
        (a, b, formFactor) => {
          const [low, high] = a <= b ? [a, b] : [b, a];
          const p1 = rateNamed("Intel Core i5-12400", low, formFactor)?.value as number;
          const p2 = rateNamed("Intel Core i5-12400", high, formFactor)?.value as number;
          expect(p1).toBeGreaterThanOrEqual(0);
          expect(p2).toBeLessThanOrEqual(100);
          expect(p1).toBeLessThanOrEqual(p2);
        },
      ),
    );
  });
});
