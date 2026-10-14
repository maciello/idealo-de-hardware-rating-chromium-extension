import { describe, expect, it } from "vitest";
import { parseGermanPrice } from "../src/page/german-price";

describe("parseGermanPrice", () => {
  it.each([
    ["1.299,00 €", 1299],
    ["ab 1.999,00 €", 1999],
    ["899,00 €", 899],
    ["89,9", 89.9],
    ["499,- €", 499],
    ["1.234.567,89 EUR", 1234567.89],
    ["12", 12],
  ])("parses %s", (text, expected) => {
    expect(parseGermanPrice(text)).toBe(expected);
  });

  it("with requireCurrency only reads numbers followed by a currency", () => {
    expect(parseGermanPrice("16 GB 512 GB 1.299,00 €", true)).toBe(1299);
    expect(parseGermanPrice("16 GB 512 GB", true)).toBeUndefined();
  });

  it("returns undefined without digits", () => {
    expect(parseGermanPrice("kostenlos")).toBeUndefined();
  });
});
