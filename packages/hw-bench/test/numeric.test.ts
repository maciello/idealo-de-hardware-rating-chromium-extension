import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { coerceNumeric } from "../src";
import { numberOrNull, requiredInteger } from "../src/benchmark/numeric";

describe("coerceNumeric", () => {
  it.each([
    ["NA", null],
    ["na", null],
    ["N/A", null],
    ["", null],
    ["   ", null],
    [null, null],
    [undefined, null],
    ["1,122", 1122],
    ["175,022", 175022],
    ["$129.95*", 129.95],
    ["$1,299.00*", 1299],
    ["-1", -1],
    ["  42 ", 42],
    ["3.5", 3.5],
    [7, 7],
  ])("maps %j to %j", (raw, expected) => {
    expect(coerceNumeric(raw)).toBe(expected);
  });

  it("leaves unparseable text untouched so the schema can reject it", () => {
    expect(coerceNumeric("Insufficient data")).toBe("Insufficient data");
    expect(coerceNumeric("12abc")).toBe("12abc");
    expect(coerceNumeric("1.2.3")).toBe("1.2.3");
  });

  it("strips a trailing unit and treats a bare unit as missing", () => {
    expect(coerceNumeric("500 MHz", "MHz")).toBe(500);
    expect(coerceNumeric("1,024 mb", "MB")).toBe(1024);
    expect(coerceNumeric(" MHz", "MHz")).toBeNull();
  });

  it("parses integers through any thousands grouping", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99_999_999 }), (n) => {
        const grouped = n.toLocaleString("en-US");
        expect(requiredInteger().parse(grouped)).toBe(n);
        expect(requiredInteger().parse(String(n))).toBe(n);
      }),
    );
  });

  it("strips $ and * decorations around cent amounts", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 9_999_999 }), (cents) => {
        const amount = cents / 100;
        const text = `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}*`;
        expect(numberOrNull().parse(text)).toBeCloseTo(amount, 2);
      }),
    );
  });

  it("never turns arbitrary letters into a number", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-zA-Z][a-zA-Z ]{0,10}$/), (text) => {
        fc.pre(!/^\s*n\/?a\s*$/i.test(text));
        expect(numberOrNull().safeParse(text).success).toBe(false);
      }),
    );
  });
});
