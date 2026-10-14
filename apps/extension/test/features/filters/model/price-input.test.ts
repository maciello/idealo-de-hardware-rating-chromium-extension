import { describe, expect, it } from "vitest";
import { isInverted, parseBound, priceRangeOf } from "../../../../src/features/filters/model";

describe("parseBound", () => {
  it("reads numbers and numeric text", () => {
    expect(parseBound(120)).toBe(120);
    expect(parseBound("99.5")).toBe(99.5);
    expect(parseBound(0)).toBe(0);
  });

  it("treats an empty or non-numeric input as no bound", () => {
    expect(parseBound("")).toBeUndefined();
    expect(parseBound("abc")).toBeUndefined();
  });
});

describe("isInverted", () => {
  it("flags a minimum above the maximum", () => {
    expect(isInverted(500, 100)).toBe(true);
  });

  it("accepts equal bounds and a missing end", () => {
    expect(isInverted(100, 100)).toBe(false);
    expect(isInverted("", 100)).toBe(false);
    expect(isInverted(500, "")).toBe(false);
  });
});

describe("priceRangeOf", () => {
  it("keeps only the ends that are set", () => {
    expect(priceRangeOf(100, 900)).toEqual({ min: 100, max: 900 });
    expect(priceRangeOf(100, "")).toEqual({ min: 100 });
    expect(priceRangeOf("", 900)).toEqual({ max: 900 });
    expect(priceRangeOf("", "")).toEqual({});
  });

  it("is null while the pair is inverted, so it is not applied", () => {
    expect(priceRangeOf(900, 100)).toBeNull();
  });
});
