import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  createStrategies,
  defaultStrategies,
  multiThreadScore,
  peerPercentile,
  percentileRank,
  segmentPercentile,
  singleThreadScore,
  valuePerEuro,
} from "../src";
import { cpuRecord, cpuRow, cpuSnapshotOf } from "./fixtures";

describe("simple strategies", () => {
  const cpu = cpuRecord({
    name: "Testcorp Core X1-1000",
    cpuMark: 28_501,
    singleThreadMark: 3_566,
  });

  it("multiThreadScore reports the CPU Mark", () => {
    expect(multiThreadScore.rate({ cpu })).toEqual({
      strategyId: "raw_multithread_score",
      value: 28_501,
      display: "28,501",
      explanation: expect.stringContaining("28,501"),
    });
  });

  it("singleThreadScore reports the single-thread mark, or null when PassMark has none", () => {
    expect(singleThreadScore.rate({ cpu })).toMatchObject({ value: 3_566, display: "3,566" });
    expect(singleThreadScore.rate({ cpu: cpuRecord({ singleThreadMark: null }) })).toBeNull();
  });

  it("valuePerEuro divides CPU Mark by the EUR price", () => {
    const rating = valuePerEuro.rate({ cpu: cpuRecord({ cpuMark: 20_000 }), priceEur: 400 });
    expect(rating).toMatchObject({ strategyId: "value_per_euro", value: 50, display: "50.0/€" });
    expect(rating?.explanation).toContain("20,000");
  });

  it.each([undefined, 0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
    "valuePerEuro is null for price %s",
    (priceEur) => {
      const input = priceEur === undefined ? { cpu } : { cpu, priceEur };
      expect(valuePerEuro.rate(input)).toBeNull();
    },
  );

  it("strategies work when detached from their object", () => {
    const { rate } = multiThreadScore;
    expect(rate({ cpu })?.strategyId).toBe("raw_multithread_score");
  });
});

describe("percentileRank", () => {
  it("counts the value itself and averages tied positions", () => {
    expect(percentileRank([10, 20, 20, 30], 5)).toBe(0);
    expect(percentileRank([10, 20, 20, 30], 10)).toBe(25);
    expect(percentileRank([10, 20, 20, 30], 15)).toBe(25);
    expect(percentileRank([10, 20, 20, 30], 20)).toBe(62.5);
    expect(percentileRank([10, 20, 20, 30], 30)).toBe(100);
    expect(percentileRank([10, 20, 20, 30], 99)).toBe(100);
    expect(percentileRank([], 1)).toBeNull();
  });

  const sortedSample = fc
    .array(fc.integer({ min: 0, max: 100_000 }), { minLength: 1, maxLength: 200 })
    .map((values) => values.sort((a, b) => a - b));

  it("stays within [0, 100]", () => {
    fc.assert(
      fc.property(sortedSample, fc.integer({ min: -10, max: 110_000 }), (sorted, value) => {
        const p = percentileRank(sorted, value);
        expect(p).not.toBeNull();
        expect(p as number).toBeGreaterThanOrEqual(0);
        expect(p as number).toBeLessThanOrEqual(100);
      }),
    );
  });

  it("is monotonic in the value", () => {
    fc.assert(
      fc.property(
        sortedSample,
        fc.integer({ min: -10, max: 110_000 }),
        fc.integer({ min: -10, max: 110_000 }),
        (sorted, a, b) => {
          const [low, high] = a <= b ? [a, b] : [b, a];
          expect(percentileRank(sorted, low) as number).toBeLessThanOrEqual(
            percentileRank(sorted, high) as number,
          );
        },
      ),
    );
  });

  it("agrees with a naive count", () => {
    fc.assert(
      fc.property(sortedSample, fc.integer({ min: -10, max: 110_000 }), (sorted, value) => {
        const below = sorted.filter((v) => v < value).length;
        const equal = sorted.filter((v) => v === value).length;
        const rank = equal === 0 ? below : below + (equal + 1) / 2;
        expect(percentileRank(sorted, value)).toBeCloseTo((rank / sorted.length) * 100, 9);
      }),
    );
  });
});

describe("peerPercentile", () => {
  const peers = [{ cpuMark: 5_000 }, { cpuMark: 10_000 }, { cpuMark: 20_000 }, { cpuMark: 30_000 }];

  it("places the CPU among the peers", () => {
    const rating = peerPercentile.rate({ cpu: cpuRecord({ cpuMark: 25_000 }), peers });
    expect(rating).toMatchObject({
      strategyId: "peer_percentile_on_listing",
      value: 75,
      display: "P75",
    });
  });

  it("needs at least two peers", () => {
    expect(peerPercentile.rate({ cpu: cpuRecord() })).toBeNull();
    expect(peerPercentile.rate({ cpu: cpuRecord(), peers: [] })).toBeNull();
    expect(peerPercentile.rate({ cpu: cpuRecord(), peers: [{ cpuMark: 1 }] })).toBeNull();
    expect(
      peerPercentile.rate({ cpu: cpuRecord(), peers: [{ cpuMark: 1 }, { cpuMark: 2 }] }),
    ).not.toBeNull();
  });

  it("ignores non-finite peer marks and does not reorder the caller's array", () => {
    const input = [{ cpuMark: 3 }, { cpuMark: Number.NaN }, { cpuMark: 1 }];
    expect(peerPercentile.rate({ cpu: cpuRecord({ cpuMark: 2 }), peers: input })?.value).toBe(50);
    expect(input.map((p) => p.cpuMark).slice(0, 1)).toEqual([3]);
  });

  it("is within [0, 100] and monotonic in the CPU Mark", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 200_000 }), { minLength: 2, maxLength: 50 }),
        fc.integer({ min: 1, max: 200_000 }),
        fc.integer({ min: 1, max: 200_000 }),
        (marks, a, b) => {
          const peerList = marks.map((cpuMark) => ({ cpuMark }));
          const [low, high] = a <= b ? [a, b] : [b, a];
          const p1 = peerPercentile.rate({
            cpu: cpuRecord({ cpuMark: low }),
            peers: peerList,
          })?.value;
          const p2 = peerPercentile.rate({
            cpu: cpuRecord({ cpuMark: high }),
            peers: peerList,
          })?.value;
          expect(p1).toBeGreaterThanOrEqual(0);
          expect(p2).toBeLessThanOrEqual(100);
          expect(p1 as number).toBeLessThanOrEqual(p2 as number);
        },
      ),
    );
  });
});

/** Real chip names with invented marks: pool membership comes from the name (see device-class.ts), not from PassMark's `cat`. */
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
    expect(laptop?.explanation).toContain("of 3 laptop CPUs");
    expect(desktop?.value).toBeCloseTo((4 / 6) * 100, 9);
    expect(desktop?.explanation).toContain("of 6 desktop CPUs");
    expect(rateNamed("AMD EPYC 9654", 2_000, "unknown")).toBeNull();
  });

  it("keeps server, phone and multi-socket results out of both pools", () => {
    expect(rateNamed("Intel Core i5-12400", 100_000, "laptop")?.value).toBe(100);
    expect(rateNamed("Intel Core i5-12400", 100_000, "desktop")?.value).toBe(100);
    expect(rateNamed("Intel Core i5-12400", 5_000, "desktop")?.explanation).toContain("of 6 ");
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

describe("registry", () => {
  it("defaultStrategies have unique ids and need no snapshot", () => {
    const ids = defaultStrategies.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "raw_multithread_score",
      "single_thread_score",
      "value_per_euro",
      "peer_percentile_on_listing",
    ]);
  });

  it("createStrategies adds the snapshot-bound strategy", () => {
    const all = createStrategies(cpuSnapshotOf(cpuRow()));
    expect(all.map((s) => s.id)).toEqual([
      ...defaultStrategies.map((s) => s.id),
      "segment_percentile",
    ]);
  });
});
