import { type CohortPolicy, DEFAULT_COHORT_POLICY, passmarkCpuSource } from "@idealo-hw/hw-bench";
import { describe, expect, it } from "vitest";
import {
  createRatingEngine,
  resolveEnabledStrategyIds,
  STRATEGY_CATALOG,
} from "../src/ratings/engine";

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

describe("createRatingEngine cohort policy", () => {
  const datedRow = (id: number, name: string, cpumark: string, date: string) => ({
    ...row(id, name, cpumark),
    date,
  });
  const dated = passmarkCpuSource.parse(
    JSON.stringify({
      data: [
        datedRow(1, "Intel Core i7-13700H", "28,000", "Jan 2023"),
        datedRow(2, "AMD Ryzen 5 7640U", "17,000", "Apr 2023"),
        datedRow(3, "Intel Core i9-13900HX", "45,000", "Jan 2023"),
        datedRow(4, "Intel Core i3-1115G4", "8,000", "Mar 2021"),
        datedRow(5, "Intel Core i5-8250U", "5,500", "Aug 2017"),
        datedRow(6, "Intel Core i5-7200U", "3,500", "Jan 2017"),
      ],
    }),
  );
  const percentile = (policy?: CohortPolicy): number | undefined => {
    // The Core i7-13700H is in both device-class sets, so the page's form factor picks the pool.
    const [result] = createRatingEngine(dated, ["segment_percentile"], policy).rate([
      { title: "Notebook Intel Core i7-13700H", text: "", formFactor: "laptop" },
    ]);
    return result?.status === "matched" ? result.ratings[0]?.value : undefined;
  };

  it("changes the segment percentile when the cohort changes", () => {
    const all = percentile({ yearCutoff: { kind: "none" }, minScore: null });
    const recent = percentile({ yearCutoff: { kind: "rolling", years: 2 }, minScore: null });
    const floor = percentile({ yearCutoff: { kind: "none" }, minScore: 20_000 });
    expect(all).toBeDefined();
    expect(recent).toBeDefined();
    expect(new Set([all, recent, floor]).size).toBe(3);
  });

  it("uses the default policy (rolling 5 years) when none is given", () => {
    expect(percentile()).toBe(percentile(DEFAULT_COHORT_POLICY));
    expect(percentile()).not.toBe(percentile({ yearCutoff: { kind: "none" }, minScore: null }));
  });
});

describe("createRatingEngine device class", () => {
  const classRow = (id: number, name: string, cpumark: string, cat: string) => ({
    ...row(id, name, cpumark),
    cat,
  });
  const classes = passmarkCpuSource.parse(
    JSON.stringify({
      data: [
        classRow(1, "AMD Ryzen AI 7 445", "25,000", "Desktop"),
        classRow(2, "Intel Core i5-1235U", "9,000", "Laptop"),
        classRow(3, "Intel Core i7-13700H", "12,000", "Laptop"),
        classRow(4, "Intel Core i9-13900HX", "20,000", "Laptop"),
        classRow(5, "AMD Ryzen 5 7640U", "11,000", "Laptop"),
        classRow(6, "Intel Core i5-12400", "19,000", "Desktop"),
        classRow(7, "AMD Ryzen 7 7700X", "34,000", "Desktop"),
        classRow(8, "AMD Ryzen 9 7950X", "62,000", "Desktop"),
        classRow(9, "Intel Core i9-14900K", "59,000", "Desktop"),
        classRow(10, "Intel Celeron N5095 @ 2.00GHz", "4,000", "Desktop"),
        classRow(11, "Qualcomm Snapdragon X Elite X1E78100", "15,000", "Laptop"),
        classRow(12, "Intel Core i5-13400", "20,000", "Desktop"),
        classRow(13, "Intel Core i7-1185G7E", "21,000", "Desktop"),
      ],
    }),
  );
  const engine = createRatingEngine(classes, ["segment_percentile"], {
    yearCutoff: { kind: "none" },
    minScore: null,
  });
  const rate = (formFactor?: "laptop" | "desktop" | "unknown") => {
    const [result] = engine.rate([
      { title: "Ryzen AI 7 445 Notebook", text: "AMD Ryzen AI 7 445", formFactor },
    ]);
    if (result?.status !== "matched") throw new Error("expected a match");
    return result;
  };

  it("ranks a CPU that PassMark files as Desktop against laptop CPUs on a laptop page", () => {
    const laptop = rate("laptop");
    expect(laptop.formFactor).toBe("laptop");
    expect(laptop.ratings[0]?.explanation).toContain("laptop CPUs");
    expect(laptop.ratings[0]?.value).toBeGreaterThan(rate("desktop").ratings[0]?.value ?? 100);
  });

  it("ranks it against desktop CPUs on a desktop page", () => {
    const desktop = rate("desktop");
    expect(desktop.formFactor).toBe("desktop");
    expect(desktop.ratings[0]?.explanation).toContain("desktop CPUs");
  });

  describe("without a form factor", () => {
    const rateChip = (title: string, formFactor?: "laptop" | "desktop") => {
      const [result] = engine.rate([{ title, text: "", formFactor }]);
      if (result?.status !== "matched") throw new Error(`expected a match for ${title}`);
      return result;
    };

    it("uses the set a chip is in alone: a laptop-only chip ranks against laptop CPUs", () => {
      const chip = "Notebook Qualcomm Snapdragon X Elite X1E78100";
      const unknown = rateChip(chip);
      expect(unknown.formFactor).toBe("unknown");
      expect(unknown.ratings[0]?.explanation).toContain("laptop CPUs");
      expect(unknown.ratings[0]?.value).toBe(rateChip(chip, "laptop").ratings[0]?.value);
    });

    it("uses the set a chip is in alone: a desktop-only chip ranks against desktop CPUs", () => {
      const unknown = rateChip("PC Intel Core i5-13400");
      expect(unknown.formFactor).toBe("unknown");
      expect(unknown.ratings[0]?.explanation).toContain("desktop CPUs");
      expect(unknown.ratings[0]?.value).toBe(
        rateChip("PC Intel Core i5-13400", "desktop").ratings[0]?.value,
      );
    });

    it("gives a chip in both sets no segment rating, but still rates it on a page that names the class", () => {
      expect(rateChip("Notebook AMD Ryzen AI 7 445").ratings).toEqual([]);
      expect(rateChip("Notebook AMD Ryzen AI 7 445", "laptop").ratings).toHaveLength(1);
    });

    it("gives a chip in neither set (embedded SKU) no segment rating", () => {
      expect(rateChip("Industrial PC Intel Core i7-1185G7E").ratings).toEqual([]);
    });
  });

  it("reads the CPU from a bare model token and says how it matched", () => {
    const [result] = engine.rate([
      {
        title: "Budget Laptop",
        text: "15,6 Zoll, N5095-CPU, 32 GB RAM, 1TB SSD",
        formFactor: "laptop",
      },
    ]);
    expect(result?.status).toBe("matched");
    expect(result?.status === "matched" && result.via).toBe("model_token");
    expect(result?.status === "matched" && result.record.name).toBe(
      "Intel Celeron N5095 @ 2.00GHz",
    );
  });

  it("prefers a spec fragment that names the CPU over a title that only hints at one", () => {
    const [result] = engine.rate([
      {
        title: "Notebook 7700X Edition",
        text: "Gaming Notebook, Intel Core i7-13700H, 32 GB RAM",
        formFactor: "laptop",
      },
    ]);
    expect(result?.status === "matched" && result.record.name).toBe("Intel Core i7-13700H");
  });
});

describe("createRatingEngine memory type", () => {
  const engine = createRatingEngine(snapshot, allIds);
  const ramTypeFor = (text: string) => {
    const [result] = engine.rate([{ title: "Notebook Intel Core i7-13700H", text }]);
    return result?.status === "matched" ? result.ramType : undefined;
  };

  it("carries the type the item's spec text names", () => {
    expect(ramTypeFor("Intel Core i7-13700H, 16 GB RAM, DDR4")).toEqual({
      label: "DDR4",
      outdated: true,
    });
    expect(ramTypeFor("Intel Core i7-13700H, DDR5")).toEqual({ label: "DDR5", outdated: false });
  });

  it("ignores graphics memory and unstated types", () => {
    expect(ramTypeFor("Intel Core i7-13700H, Grafikspeichertyp GDDR6")).toBeNull();
    expect(ramTypeFor("Intel Core i7-13700H, 16 GB RAM")).toBeNull();
  });
});
