import { describe, expect, it } from "vitest";
import { formatMegabytes, formatMemorySize } from "../../../src/ui/format";

describe("formatMegabytes", () => {
  it("uses decimal megabytes with at most one de-DE fraction digit", () => {
    expect(formatMegabytes(1_234_567)).toBe("1,2");
    expect(formatMegabytes(5_000_000)).toBe("5");
    expect(formatMegabytes(0)).toBe("0");
  });
});

describe("formatMemorySize", () => {
  it("writes whole gigabytes without a fraction", () => {
    expect(formatMemorySize(16 * 1024)).toBe("16 GB");
    expect(formatMemorySize(8192)).toBe("8 GB");
    expect(formatMemorySize(6144)).toBe("6 GB");
  });

  it("writes at most one de-DE fraction digit", () => {
    expect(formatMemorySize(1536)).toBe("1,5 GB");
    expect(formatMemorySize(1741)).toBe("1,7 GB");
  });

  it("falls back to megabytes below one gigabyte", () => {
    expect(formatMemorySize(512)).toBe("512 MB");
    expect(formatMemorySize(1023)).toBe("1.023 MB");
  });
});
