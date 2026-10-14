import { passmarkCpuSource } from "@idealo-hw/hw-bench";
import { describe, expect, it } from "vitest";
import { createRatingEngine, type ItemRating, STRATEGY_CATALOG } from "../src/ratings/engine";
import {
  cardRows,
  chipModel,
  formatDecimal,
  formatImportDate,
  formatInteger,
  meterSegments,
  topPercent,
  valueText,
} from "../src/ratings/present";

describe("meterSegments", () => {
  it.each([
    [0, 0],
    [0.1, 1],
    [20, 1],
    [20.1, 2],
    [66.7, 4],
    [80, 4],
    [80.5, 5],
    [100, 5],
  ])("percentile %s fills %s of 5 segments", (percentile, filled) => {
    expect(meterSegments(percentile)).toBe(filled);
  });

  it("clamps out-of-range input and hides the meter without data", () => {
    expect(meterSegments(-5)).toBe(0);
    expect(meterSegments(140)).toBe(5);
    expect(meterSegments(null)).toBeNull();
    expect(meterSegments(undefined)).toBeNull();
    expect(meterSegments(Number.NaN)).toBeNull();
  });
});

describe("de-DE formatting", () => {
  it("groups thousands with a dot and uses a decimal comma", () => {
    expect(formatInteger(9986)).toBe("9.986");
    expect(formatInteger(28000)).toBe("28.000");
    expect(formatInteger(512)).toBe("512");
    expect(formatInteger(1234567)).toBe("1.234.567");
    expect(formatDecimal(17.6)).toBe("17,6");
    expect(formatDecimal(21.5496)).toBe("21,5");
    expect(formatDecimal(3)).toBe("3,0");
  });

  it("formats the import date like idealo does, in UTC", () => {
    expect(formatImportDate("2026-10-14T23:59:00.000Z")).toBe("14.10.2026");
    expect(formatImportDate(null)).toBeNull();
    expect(formatImportDate("not a date")).toBeNull();
  });

  it("reads 'top N%' from a percentile and never says top 0%", () => {
    expect(topPercent(77)).toBe(23);
    expect(topPercent(100)).toBe(1);
    expect(topPercent(0)).toBe(100);
  });
});

const row = (id: number, name: string, cpumark: string, thread = "3,000", cat = "Laptop") => ({
  id: String(id),
  name,
  cpumark,
  thread,
  cat,
  cpuCount: 1,
  cores: "8",
  logicals: "2",
  secondaryCores: "0",
  secondaryLogicals: "0",
  date: "Mar 2023",
});
const snapshot = passmarkCpuSource.parse(
  JSON.stringify({
    data: [
      row(1, "Intel Core i7-13700H", "28,000", "3,900"),
      row(2, "AMD Ryzen 5 7640U", "17,000"),
      row(3, "Intel Core i9-13900HX", "45,000"),
    ],
  }),
);
const allIds = STRATEGY_CATALOG.map((s) => s.id);
const rate = (enabled: readonly string[] = allIds): Extract<ItemRating, { status: "matched" }> => {
  const [first] = createRatingEngine(snapshot, enabled).rate([
    { title: "A Intel Core i7-13700H", text: "", priceEur: 1299 },
    { title: "B AMD Ryzen 5 7640U", text: "", priceEur: 899 },
    { title: "C Intel Core i9-13900HX", text: "", priceEur: 1999 },
  ]);
  if (first?.status !== "matched") throw new Error("expected a match");
  return first;
};

describe("chipModel and cardRows", () => {
  it("shows the primary number with the segment meter", () => {
    const model = chipModel(rate(), "raw_multithread_score");
    expect(model).toMatchObject({ value: "28.000", label: "CPU", filled: 4 });
    expect(model?.aria).toContain("top 33% of laptop CPUs");
  });

  it("switches the headline value with the primary strategy", () => {
    const matched = rate();
    expect(chipModel(matched, "single_thread_score")?.value).toBe("3.900");
    expect(chipModel(matched, "value_per_euro")?.value).toBe("21,6 /€");
    expect(chipModel(matched, "peer_percentile_on_listing")?.value).toBe("#2 of 3");
  });

  it("falls back to the next available number when the primary one is disabled", () => {
    const only = rate(["single_thread_score", "segment_percentile"]);
    expect(chipModel(only, "raw_multithread_score")?.value).toBe("3.900");
  });

  it("uses the on-page percentile for the meter when the segment one is disabled", () => {
    const model = chipModel(
      rate(["raw_multithread_score", "peer_percentile_on_listing"]),
      "raw_multithread_score",
    );
    expect(model?.filled).toBe(4);
    expect(model?.aria).toContain("on this page");
  });

  it("hides the meter when neither percentile is enabled, and the chip when nothing is", () => {
    expect(chipModel(rate(["raw_multithread_score"]), "raw_multithread_score")?.filled).toBeNull();
    expect(chipModel(rate([]), "raw_multithread_score")).toBeNull();
  });

  it("builds one row per enabled strategy, the meter on the first, explanations as titles", () => {
    const rows = cardRows(rate());
    expect(rows.map((r) => [r.label, r.value])).toEqual([
      ["Multi-thread", "28.000"],
      ["Single-thread", "3.900"],
      ["Per euro", "21,6 /€"],
      ["On this page", "#2 of 3"],
    ]);
    expect(rows[0]?.meter).toEqual({ filled: 4, text: "top 33% of laptop CPUs" });
    expect(rows.slice(1).every((r) => r.meter === null)).toBe(true);
    expect(rows.every((r) => r.title.length > 0)).toBe(true);
  });

  it("gives the segment percentile its own row when multi-thread is disabled", () => {
    const rows = cardRows(rate(["single_thread_score", "segment_percentile"]));
    expect(rows.map((r) => r.label)).toEqual(["In its segment", "Single-thread"]);
    expect(rows[0]).toMatchObject({ value: "top 33%", meter: { filled: 4 } });
  });

  it("falls back to the strategy's own display for unknown strategies", () => {
    expect(
      valueText({ strategyId: "future", value: 1, display: "X1", explanation: "" }, null),
    ).toBe("X1");
  });
});

describe("page rank", () => {
  it("ranks among matched products of the call; ties share the better rank", () => {
    const engine = createRatingEngine(snapshot, allIds);
    const results = engine.rate([
      { title: "A Intel Core i7-13700H", text: "" },
      { title: "B Intel Core i7-13700H", text: "" },
      { title: "C Intel Core i9-13900HX", text: "" },
    ]);
    const ranks = results.map((r) => (r.status === "matched" ? r.pageRank : null));
    expect(ranks).toEqual([
      { rank: 2, total: 3 },
      { rank: 2, total: 3 },
      { rank: 1, total: 3 },
    ]);
  });

  it("is null below two peers", () => {
    const [only] = createRatingEngine(snapshot, allIds).rate([
      { title: "A Intel Core i7-13700H", text: "" },
    ]);
    expect(only?.status === "matched" && only.pageRank).toBeNull();
  });
});
