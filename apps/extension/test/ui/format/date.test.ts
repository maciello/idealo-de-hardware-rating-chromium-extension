import { describe, expect, it } from "vitest";
import { formatImportDate, formatShortDate } from "../../../src/ui/format";

describe("de-DE date formatting", () => {
  it("formats the import date like idealo does, in UTC", () => {
    expect(formatImportDate("2026-10-14T23:59:00.000Z")).toBe("14.10.2026");
    expect(formatImportDate(null)).toBeNull();
    expect(formatImportDate("not a date")).toBeNull();
  });

  it("drops the year in the short form and tolerates missing input", () => {
    expect(formatShortDate("2026-10-14T23:59:00.000Z")).toBe("14.10.");
    expect(formatShortDate(null)).toBeNull();
    expect(formatShortDate(undefined)).toBeNull();
    expect(formatShortDate("not a date")).toBeNull();
  });
});
