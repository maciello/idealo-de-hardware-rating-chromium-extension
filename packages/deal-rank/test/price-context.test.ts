import { describe, expect, it } from "vitest";
import { priceContext } from "../src";

const ctx = (historyCents: number[], bestPriceEur: number, bargainBadgePct: number | null = null) =>
  priceContext({ historyCents, bestPriceEur, bargainBadgePct });

describe("priceContext", () => {
  it("is null without history", () => {
    expect(ctx([], 100)).toBeNull();
  });
  it("reports low, high, median, last and the gap to the low", () => {
    const c = ctx([100_00, 110_00, 120_00], 110);
    expect(c).toMatchObject({ low: 100, high: 120, median: 110, last: 120, points: 3 });
    expect(c?.pct_above_low).toBeCloseTo(0.1, 6);
  });
  it("calls a narrow range flat", () => {
    expect(ctx([100_00, 100_50, 100_00], 100)?.trend).toBe("flat");
  });
  it("detects falling, rising and mixed trends", () => {
    expect(ctx([120_00, 120_00, 120_00, 100_00], 100)?.trend).toBe("falling");
    expect(ctx([100_00, 100_00, 100_00, 120_00], 120)?.trend).toBe("rising");
    expect(ctx([100_00, 120_00, 110_00], 110)?.trend).toBe("mixed");
  });
  it("lists dips at 90% of the median or lower", () => {
    const c = ctx([100_00, 100_00, 80_00, 100_00, 100_00], 100);
    expect(c?.dips).toEqual([{ index: 2, value: 80 }]);
  });
  it("flags a bargain badge when the price sits 3% over the low", () => {
    expect(ctx([100_00, 120_00], 104, 15)?.badge_inflated).toBe(true);
    expect(ctx([100_00, 120_00], 101, 15)?.badge_inflated).toBe(false);
    expect(ctx([100_00, 120_00], 130, null)?.badge_inflated).toBe(false);
  });
});
