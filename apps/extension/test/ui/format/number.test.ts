import { describe, expect, it } from "vitest";
import { formatDecimal, formatInteger, formatTrimmed } from "../../../src/ui/format";

describe("de-DE number formatting", () => {
  it("groups thousands with a dot and uses a decimal comma", () => {
    expect(formatInteger(9986)).toBe("9.986");
    expect(formatInteger(28000)).toBe("28.000");
    expect(formatInteger(512)).toBe("512");
    expect(formatInteger(1234567)).toBe("1.234.567");
    expect(formatDecimal(17.6)).toBe("17,6");
    expect(formatDecimal(21.5496)).toBe("21,5");
    expect(formatDecimal(3)).toBe("3,0");
  });

  it("trims to two decimals without trailing zeros", () => {
    expect(formatTrimmed(16)).toBe("16");
    expect(formatTrimmed(1.4)).toBe("1,4");
    expect(formatTrimmed(0.3549)).toBe("0,35");
  });
});
