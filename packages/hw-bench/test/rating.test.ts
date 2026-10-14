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

describe("segmentPercentile", () => {
  const snapshot = cpuSnapshotOf(
    cpuRow({ name: "D1", cpumark: "1,000", cat: "Desktop" }),
    cpuRow({ name: "D2", cpumark: "2,000", cat: "Desktop" }),
    cpuRow({ name: "D3", cpumark: "3,000", cat: "Desktop, Laptop" }),
    cpuRow({ name: "D4", cpumark: "4,000", cat: "Desktop" }),
    cpuRow({ name: "D-dual", cpumark: "99,000", cat: "Desktop", cpuCount: "2" }),
    cpuRow({ name: "L1", cpumark: "500", cat: "Laptop" }),
    cpuRow({ name: "L2", cpumark: "1,500", cat: "Laptop" }),
    cpuRow({ name: "U1", cpumark: "700", cat: "Unknown" }),
  );
  const strategy = segmentPercentile(snapshot);

  it("ranks within the CPU's own segment and excludes multi-socket results from the pool", () => {
    // pools: desktop [1000, 2000, 3000, 4000] (99,000 dual-socket excluded), laptop [500, 1500, 3000]
    const rate = (cpuMark: number, segments: readonly ("desktop" | "laptop" | "unknown")[]) =>
      strategy.rate({ cpu: cpuRecord({ cpuMark, segments }) });
    expect(rate(2_500, ["desktop"])).toMatchObject({ strategyId: "segment_percentile", value: 50 });
    expect(rate(2_500, ["laptop"])?.value).toBeCloseTo(200 / 3, 9);
    expect(rate(1_000, ["laptop"])?.value).toBeCloseTo(100 / 3, 9);
    expect(rate(100_000, ["desktop"])?.value).toBe(100);
  });

  it("uses the first non-unknown segment and returns null for unknown-only CPUs", () => {
    expect(
      strategy.rate({ cpu: cpuRecord({ cpuMark: 500, segments: ["unknown", "laptop"] }) })?.value,
    ).toBeCloseTo(100 / 3, 9);
    expect(strategy.rate({ cpu: cpuRecord({ segments: ["unknown"] }) })).toBeNull();
    expect(strategy.rate({ cpu: cpuRecord({ segments: ["server"] }) })).toBeNull();
  });

  it("is monotonic and bounded for any CPU Mark", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 150_000 }),
        fc.integer({ min: 0, max: 150_000 }),
        (a, b) => {
          const [low, high] = a <= b ? [a, b] : [b, a];
          const p1 = strategy.rate({ cpu: cpuRecord({ cpuMark: low }) })?.value as number;
          const p2 = strategy.rate({ cpu: cpuRecord({ cpuMark: high }) })?.value as number;
          expect(p1).toBeGreaterThanOrEqual(0);
          expect(p2).toBeLessThanOrEqual(100);
          expect(p1).toBeLessThanOrEqual(p2);
        },
      ),
    );
  });
});

describe("segmentPercentile with a page form factor", () => {
  const snapshot = cpuSnapshotOf(
    cpuRow({ name: "D1", cpumark: "1,000", cat: "Desktop" }),
    cpuRow({ name: "D2", cpumark: "2,000", cat: "Desktop" }),
    cpuRow({ name: "D3", cpumark: "9,000", cat: "Desktop" }),
    cpuRow({ name: "D4", cpumark: "10,000", cat: "Desktop, Laptop" }),
    cpuRow({ name: "L1", cpumark: "500", cat: "Laptop" }),
    cpuRow({ name: "M1", cpumark: "1,500", cat: "Mobile/Embedded" }),
    cpuRow({ name: "LM", cpumark: "3,000", cat: "Laptop, Mobile/Embedded" }),
    cpuRow({ name: "S1", cpumark: "50,000", cat: "Server" }),
    cpuRow({ name: "M-dual", cpumark: "99,000", cat: "Mobile/Embedded", cpuCount: "2" }),
  );
  const strategy = segmentPercentile(snapshot);
  // laptop pool: L1 500, M1 1500, LM 3000 (listed under both segments, counted once), D4 10000
  // desktop pool: D1 1000, D2 2000, D3 9000, D4 10000

  it("ranks a CPU filed under desktop against the laptop pool on a laptop page", () => {
    const rating = strategy.rate({
      cpu: cpuRecord({ cpuMark: 2_000, segments: ["desktop"] }),
      formFactor: "laptop",
    });
    expect(rating?.value).toBe(50);
    expect(rating?.explanation).toContain("of 4 laptop CPUs");
  });

  it("ranks a CPU filed under mobile/embedded or laptop+desktop against the laptop pool", () => {
    expect(
      strategy.rate({
        cpu: cpuRecord({ cpuMark: 9_000, segments: ["mobile_embedded"] }),
        formFactor: "laptop",
      })?.value,
    ).toBe(75);
    expect(
      strategy.rate({
        cpu: cpuRecord({ cpuMark: 9_000, segments: ["desktop", "laptop"] }),
        formFactor: "laptop",
      })?.value,
    ).toBe(75);
  });

  it("ranks against the desktop pool on a desktop page, whatever segment the CPU is filed under", () => {
    const rating = strategy.rate({
      cpu: cpuRecord({ cpuMark: 2_000, segments: ["laptop"] }),
      formFactor: "desktop",
    });
    expect(rating?.value).toBe(50);
    expect(rating?.explanation).toContain("of 4 desktop CPUs");
  });

  it("rates CPUs without any usable PassMark segment when the page names the device class", () => {
    expect(
      strategy.rate({
        cpu: cpuRecord({ cpuMark: 2_000, segments: ["unknown"] }),
        formFactor: "laptop",
      }),
    ).not.toBeNull();
    expect(
      strategy.rate({
        cpu: cpuRecord({ cpuMark: 2_000, segments: ["server"] }),
        formFactor: "desktop",
      }),
    ).not.toBeNull();
  });

  it("falls back to the CPU's own first segment for an unknown or absent form factor", () => {
    const cpu = cpuRecord({ cpuMark: 2_000, segments: ["desktop", "laptop"] });
    const own = strategy.rate({ cpu });
    expect(own?.explanation).toContain("desktop CPUs");
    expect(strategy.rate({ cpu, formFactor: "unknown" })).toEqual(own);
    expect(
      strategy.rate({ cpu: cpuRecord({ segments: ["unknown"] }), formFactor: "unknown" }),
    ).toBeNull();
  });

  it("excludes multi-socket records from the laptop pool", () => {
    expect(
      strategy.rate({ cpu: cpuRecord({ cpuMark: 100_000 }), formFactor: "laptop" })?.value,
    ).toBe(100);
  });

  it("returns null for a laptop page when the snapshot has no laptop-class records", () => {
    const desktopOnly = segmentPercentile(cpuSnapshotOf(cpuRow({ cat: "Desktop" })));
    expect(desktopOnly.rate({ cpu: cpuRecord(), formFactor: "laptop" })).toBeNull();
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
