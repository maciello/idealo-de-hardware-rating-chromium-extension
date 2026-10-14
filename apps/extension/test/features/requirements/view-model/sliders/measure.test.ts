import { describe, expect, it } from "vitest";
import {
  formatMeasure,
  labelledMarks,
} from "../../../../../src/features/requirements/view-model/sliders/measure";

describe("measure text and marks", () => {
  it("formats measures the way idealo writes them", () => {
    expect(formatMeasure(16, "gigabyte")).toBe("16 GB");
    expect(formatMeasure(1000, "gigabyte")).toBe("1 TB");
    expect(formatMeasure(1.4, "kilogram")).toBe("1,4 kg");
    expect(formatMeasure(2025, "plain")).toBe("2025");
  });

  it("labels the ends and only the marks that keep their distance", () => {
    const marks = labelledMarks([0, 5, 10, 50, 60, 100], String);
    expect(marks.map((mark) => mark.label ?? null)).toEqual(["0", null, null, "50", null, "100"]);
  });
});
