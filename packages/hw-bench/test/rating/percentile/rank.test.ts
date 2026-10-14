import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { percentileRank } from "../../../src";

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
