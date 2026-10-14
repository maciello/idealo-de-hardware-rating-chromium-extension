import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { peerPercentile } from "../../../src";
import { cpuRecord } from "../../fixtures";

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
