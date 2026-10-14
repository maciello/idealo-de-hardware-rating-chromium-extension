// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { pageReportOf } from "../../../../src/features/ratings/controller/page-report";
import type { TileRating } from "../../../../src/features/ratings/controller/types";
import type { GpuReading } from "../../../../src/features/ratings/model";

const seen = (title: string) =>
  ({
    adapterId: "idealo_ssr",
    productId: null,
    textSource: "dom",
    title,
    text: "",
  }) as const;

const tile = (title: string, gpu: GpuReading | null): TileRating => ({
  target: {
    element: document.createElement("div"),
    query: { title, text: "" },
    placement: "corner",
    seen: seen(title),
  },
  rating: { status: "no_match" },
  gpu,
  signals: [],
});

const gpuLine = { primary: {}, companion: null } as never;

describe("pageReportOf", () => {
  it("counts the products found and the ones with a rating", () => {
    const { stats } = pageReportOf("listing", 3, [tile("A", gpuLine), tile("B", null)]);
    expect(stats).toEqual({ kind: "listing", total: 3, rated: 1 });
  });

  it("lists what was read per item with whether it was rated", () => {
    const { inspection } = pageReportOf("listing", 2, [tile("A", gpuLine), tile("B", null)]);
    expect(inspection).toEqual({
      kind: "listing",
      items: [
        { ...seen("A"), rated: true },
        { ...seen("B"), rated: false },
      ],
    });
  });

  it("reports an empty page", () => {
    expect(pageReportOf("other", 0, [])).toEqual({
      stats: { kind: "other", total: 0, rated: 0 },
      inspection: { kind: "other", items: [] },
    });
  });
});
