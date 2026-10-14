import { describe, expect, it } from "vitest";
import { pageRankOf } from "../../../../../src/features/ratings/model";

describe("pageRankOf", () => {
  const peers = [{ cpuMark: 30 }, { cpuMark: 20 }, { cpuMark: 20 }, { cpuMark: 10 }];

  it("ranks by CPU Mark, the fastest first", () => {
    expect(pageRankOf(30, peers)).toEqual({ rank: 1, total: 4 });
    expect(pageRankOf(10, peers)).toEqual({ rank: 4, total: 4 });
  });

  it("gives ties the better rank", () => {
    expect(pageRankOf(20, peers)).toEqual({ rank: 2, total: 4 });
  });

  it("says nothing below two peers", () => {
    expect(pageRankOf(30, [{ cpuMark: 30 }])).toBeNull();
    expect(pageRankOf(30, [])).toBeNull();
  });
});
