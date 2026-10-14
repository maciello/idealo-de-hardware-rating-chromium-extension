import type { CpuBenchmarkRecord, Rating } from "@idealo-hw/hw-bench";
import { describe, expect, it } from "vitest";
import {
  hasChip,
  type ItemRating,
  isRated,
  isVisible,
  visibleCpu,
} from "../../../../src/features/ratings/model";

const noMatch: ItemRating = { status: "no_match" };
const ambiguous: ItemRating = { status: "ambiguous", candidates: [] };
const record: CpuBenchmarkRecord = {
  id: 1,
  name: "Testcorp Core X1-1000",
  cpuMark: 10_000,
  singleThreadMark: 2_500,
  cores: 8,
  threadsPerCore: 2,
  efficiencyCores: 0,
  efficiencyThreadsPerCore: 0,
  socketCount: 1,
  baseClockMhz: 3_400,
  turboClockMhz: 4_600,
  tdpWatts: 65,
  priceUsd: null,
  socket: "LGA9999",
  segments: ["desktop"],
  released: { year: 2022, month: 3 },
  rank: 100,
  samples: 10,
};
const numberRating: Rating = {
  strategyId: "raw_multithread_score",
  value: 10_000,
  display: "10.000",
  explanation: "",
};
const matched = (ratings: number): ItemRating => ({
  status: "matched",
  record,
  via: "exact",
  formFactor: "desktop",
  ramType: null,
  ratings: Array.from({ length: ratings }, () => numberRating),
  signals: [],
  pageRank: null,
});
const gpu = { primary: {}, companion: null } as never;

describe("visibility", () => {
  it("shows an ambiguous CPU and a matched one with at least one number", () => {
    expect(isVisible(ambiguous)).toBe(true);
    expect(isVisible(matched(1))).toBe(true);
    expect(isVisible(matched(0))).toBe(false);
    expect(isVisible(noMatch)).toBe(false);
  });

  it("hands back the rating itself when it is visible, else null", () => {
    expect(visibleCpu(ambiguous)).toBe(ambiguous);
    const rating = matched(2);
    expect(visibleCpu(rating)).toBe(rating);
    expect(visibleCpu(matched(0))).toBeNull();
    expect(visibleCpu(noMatch)).toBeNull();
  });

  it("counts an ambiguous CPU toward the chip but not toward the rated stats", () => {
    expect(hasChip({ rating: ambiguous, gpu: null })).toBe(true);
    expect(isRated({ rating: ambiguous, gpu: null })).toBe(false);
  });

  it("counts any GPU line as rated and as a chip", () => {
    expect(isRated({ rating: noMatch, gpu })).toBe(true);
    expect(hasChip({ rating: noMatch, gpu })).toBe(true);
    expect(hasChip({ rating: noMatch, gpu: null })).toBe(false);
  });
});
