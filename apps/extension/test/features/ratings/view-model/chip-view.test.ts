import { passmarkCpuSource } from "@idealo-hw/hw-bench";
import { describe, expect, it } from "vitest";
import {
  createGpuEngine,
  createRatingEngine,
  STRATEGY_CATALOG,
  signalsOf,
} from "../../../../src/features/ratings/model";
import { cardViewOf, chipViewOf } from "../../../../src/features/ratings/view-model";
import { GPU_SPECS, gpuSnapshotOf } from "../gpu-snapshot";

const snapshot = passmarkCpuSource.parse(
  JSON.stringify({
    data: [
      {
        id: "1",
        name: "Intel Core i7-13700H",
        cpumark: "28,000",
        thread: "3,900",
        cat: "Laptop",
        cpuCount: 1,
        cores: "8",
        logicals: "2",
        secondaryCores: "0",
        secondaryLogicals: "0",
        date: "Mar 2023",
      },
    ],
  }),
);
const [rating] = createRatingEngine(
  snapshot,
  STRATEGY_CATALOG.map((s) => s.id),
).rate([{ title: "Intel Core i7-13700H", text: "", priceEur: 1299, formFactor: "laptop" }]);
if (rating?.status !== "matched") throw new Error("expected a match");

const ambiguous = { status: "ambiguous", candidates: [{ id: 4, name: "A" }] } as never;

describe("chipViewOf", () => {
  it("draws nothing without a CPU line or a GPU line", () => {
    expect(chipViewOf(null, null, "raw_multithread_score", [])).toBeNull();
  });

  it("names the CPU line in the chip's accessible name", () => {
    const view = chipViewOf(rating, null, "raw_multithread_score", []);
    expect(view?.status).toBe("matched");
    expect(view?.aria).toBe(`${view?.model?.aria}. Show details`);
  });

  it("keeps an ambiguous CPU without numbers", () => {
    const view = chipViewOf(ambiguous, null, "raw_multithread_score", []);
    expect(view).toMatchObject({ status: "ambiguous", model: null });
    expect(view?.aria).toBe("CPU: several PassMark matches. Show details");
  });
});

describe("chipViewOf signals line", () => {
  const flags = signalsOf(
    { title: "Notebook", text: "", formFactor: "laptop", datasheet: "RAM\t4 GB" },
    { status: "no_match" },
    { year: 2026 },
  );
  const [igpu] = createGpuEngine(gpuSnapshotOf(...GPU_SPECS)).rate([
    { title: "Notebook", text: "Intel Core Ultra 7 258V", formFactor: "laptop" },
  ]);
  if (igpu === undefined || igpu === null) throw new Error("expected an iGPU line");

  it("trails the flags after the CPU line", () => {
    expect(chipViewOf(rating, null, "raw_multithread_score", flags)?.signalsLine).toBe("cpu");
  });

  it("trails them after the GPU line when there is no CPU line", () => {
    expect(chipViewOf(null, igpu, "raw_multithread_score", flags)?.signalsLine).toBe("gpu");
  });

  it("gives them a line of their own when nothing else is drawn", () => {
    expect(chipViewOf(null, null, "raw_multithread_score", flags)?.signalsLine).toBe("own");
  });

  it("has no place for signals the chip does not draw", () => {
    expect(chipViewOf(rating, null, "raw_multithread_score", [])?.signalsLine).toBeNull();
  });
});

describe("cardViewOf", () => {
  it("lists the candidates of an ambiguous CPU and dates the import", () => {
    const card = cardViewOf(ambiguous, null, [], "2026-10-14T10:00:00.000Z");
    expect(card.cpu).toEqual({
      kind: "ambiguous",
      title: "Several PassMark CPUs match",
      sub: "The title does not say which one it is.",
      candidates: [{ id: 4, name: "A" }],
    });
    expect(card.footer).toBe("PassMark import 14.10.2026");
    expect(card.gpuSections).toEqual([]);
  });

  it("titles a matched CPU with its PassMark name and leaves the footer undated without a date", () => {
    const card = cardViewOf(rating, null, [], null);
    expect(card.cpu).toMatchObject({
      kind: "matched",
      title: "Intel Core i7-13700H",
      sub: "Matched to PassMark entry",
    });
    expect(card.footer).toBe("PassMark import");
  });

  it("has no CPU block when only the GPU was recognised", () => {
    expect(cardViewOf(null, null, [], null).cpu).toBeNull();
  });
});
