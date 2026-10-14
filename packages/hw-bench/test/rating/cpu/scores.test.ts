import { describe, expect, it } from "vitest";
import { multiThreadScore, singleThreadScore, valuePerEuro } from "../../../src";
import { cpuRecord } from "../../fixtures";

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
