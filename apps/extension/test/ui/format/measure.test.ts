import { describe, expect, it } from "vitest";
import { formatMegabytes } from "../../../src/ui/format";

describe("formatMegabytes", () => {
  it("uses decimal megabytes with at most one de-DE fraction digit", () => {
    expect(formatMegabytes(1_234_567)).toBe("1,2");
    expect(formatMegabytes(5_000_000)).toBe("5");
    expect(formatMegabytes(0)).toBe("0");
  });
});
