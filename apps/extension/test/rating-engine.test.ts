import { passmarkCpuSource } from "@idealo-hw/hw-bench";
import { describe, expect, it } from "vitest";
import { STRATEGY_CATALOG, createRatingEngine, resolveEnabledStrategyIds } from "../src/ratings/engine";

const row = (id: number, name: string, cpumark: string) => ({
  id: String(id),
  name,
  cpumark,
  thread: "3,000",
  cat: "Laptop",
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
      row(1, "Intel Core i7-13700H", "28,000"),
      row(2, "AMD Ryzen 5 7640U", "17,000"),
      row(3, "Intel Core i9-13900HX", "45,000"),
      row(4, "Intel Core i3-1115G4", "8,000"),
      row(5, "Intel Core i3-1115G4", "8,100"),
    ],
  }),
);
const allIds = STRATEGY_CATALOG.map((s) => s.id);

describe("createRatingEngine", () => {
  const engine = createRatingEngine(snapshot, allIds);

  it("matches CPUs from the title, then from the item text", () => {
    const [a, b] = engine.rate([
      { title: "Alpha Notebook Intel Core i7-13700H", text: "", priceEur: 1299 },
      { title: "Beta Notebook", text: "Prozessor: AMD Ryzen 5 7640U", priceEur: 899 },
    ]);
    expect(a?.status === "matched" && a.record.name).toBe("Intel Core i7-13700H");
    expect(b?.status === "matched" && b.record.name).toBe("AMD Ryzen 5 7640U");
  });

  it("renders nothing for unknown CPUs and items without a CPU", () => {
    const results = engine.rate([
      { title: "Intel Core i5-99999X Notebook", text: "" },
      { title: "Plain notebook", text: "no cpu here" },
    ]);
    expect(results.map((r) => r.status)).toEqual(["no_match", "no_match"]);
  });

  it("reports ambiguous matches with their candidates", () => {
    const [result] = engine.rate([{ title: "Intel Core i3-1115G4 Laptop", text: "" }]);
    expect(result?.status).toBe("ambiguous");
    expect(result?.status === "ambiguous" && result.candidates).toHaveLength(2);
  });

  it("uses all matched items of one call as peers for the listing percentile", () => {
    const results = engine.rate([
      { title: "A Intel Core i7-13700H", text: "", priceEur: 1000 },
      { title: "B AMD Ryzen 5 7640U", text: "", priceEur: 800 },
      { title: "C Intel Core i9-13900HX", text: "", priceEur: 2000 },
    ]);
    const percentile = (i: number) =>
      results[i]?.status === "matched"
        ? results[i].ratings.find((r) => r.strategyId === "peer_percentile_on_listing")?.value
        : undefined;
    expect(percentile(2)).toBeGreaterThan(percentile(0) ?? Number.POSITIVE_INFINITY);
    expect(percentile(0)).toBeGreaterThan(percentile(1) ?? Number.POSITIVE_INFINITY);
  });

  it("only emits enabled strategies", () => {
    const only = createRatingEngine(snapshot, ["raw_multithread_score"]);
    const [result] = only.rate([{ title: "Intel Core i7-13700H", text: "", priceEur: 1000 }]);
    expect(result?.status === "matched" && result.ratings.map((r) => r.strategyId)).toEqual([
      "raw_multithread_score",
    ]);
  });
});

describe("resolveEnabledStrategyIds", () => {
  it("enables everything until settings exist and drops unknown ids", () => {
    expect(resolveEnabledStrategyIds(undefined)).toEqual(allIds);
    expect(resolveEnabledStrategyIds(["value_per_euro", "gone"])).toEqual(["value_per_euro"]);
  });
});
