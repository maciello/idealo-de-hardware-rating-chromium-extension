import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  type CohortPolicy,
  createGpuMatcher,
  createGpuStrategies,
  createStrategies,
  DEFAULT_COHORT_POLICY,
  type FormFactor,
  type GpuBenchmarkRecord,
  g3dScore,
  gpuPercentile,
  gpuScoreBounds,
  gpuValuePerEuro,
  passmarkGpuSource,
  rateGpuMatch,
} from "../src";
import { asJson, cpuRow, cpuSnapshotOf, gpuRow } from "./fixtures";

interface Spec {
  readonly name: string;
  readonly cat: string;
  readonly g3d: number;
  readonly date?: string;
}

const snapshotOf = (...specs: readonly Spec[]) =>
  passmarkGpuSource.parse(
    asJson(
      specs.map((spec, i) =>
        gpuRow({
          id: String(8000 + i),
          name: spec.name,
          cat: spec.cat,
          g3d: String(spec.g3d),
          date: spec.date ?? "Jun 2024",
        }),
      ),
    ),
  );

const recordNamed = (specs: readonly Spec[], name: string): GpuBenchmarkRecord => {
  const record = snapshotOf(...specs).records.find((r) => r.name === name);
  if (record === undefined) throw new Error(`${name} missing`);
  return record;
};

const NO_CUTOFF: CohortPolicy = { yearCutoff: { kind: "none" }, minScore: null };

/**
 * Reference sets (sinceYear 2020, anchored to the newest record, 2024):
 * LaptopGpu  = RTX 9080 Laptop 26,000, RTX 9060 Laptop 16,000, Iris Xe 2,500, Radeon 780M 6,700
 * DesktopGpu = RTX 9080 36,000, RTX 9060 19,000, Radeon RX 9999 30,000, UHD 770 1,900, and the two iGPUs that ship in
 *              mini PCs too (Iris Xe, Radeon 780M)
 * In neither: a vGPU profile, a virtual display driver, and a laptop card from 2017 (past the year cutoff).
 */
const specs: readonly Spec[] = [
  { name: "GeForce RTX 9080 Laptop GPU", cat: "Mobile", g3d: 26_000 },
  { name: "GeForce RTX 9060 Laptop GPU", cat: "Mobile", g3d: 16_000 },
  { name: "GeForce GTX 1050 Laptop GPU", cat: "Mobile", g3d: 6_000, date: "Jan 2017" },
  { name: "Intel Iris Xe", cat: "Unknown", g3d: 2_500 },
  { name: "Radeon 780M", cat: "Mobile", g3d: 6_700 },
  { name: "GeForce RTX 9080", cat: "Desktop", g3d: 36_000 },
  { name: "GeForce RTX 9060", cat: "Desktop", g3d: 19_000 },
  { name: "Radeon RX 9999", cat: "Desktop", g3d: 30_000 },
  { name: "Intel UHD Graphics 770", cat: "Unknown", g3d: 1_900 },
  { name: "A40-12Q", cat: "Unknown", g3d: 5_000 },
  { name: "Mirage Driver", cat: "Unknown", g3d: 90 },
];

describe("GPU score strategies", () => {
  const gpu = recordNamed(specs, "GeForce RTX 9060 Laptop GPU");

  it("g3dScore reports the raw G3D Mark", () => {
    expect(g3dScore.rate({ gpu })).toEqual({
      strategyId: "gpu_g3d_score",
      value: 16_000,
      display: "16,000",
      explanation: "PassMark G3D Mark of GeForce RTX 9060 Laptop GPU: 16,000.",
    });
  });

  it("gpuValuePerEuro divides the G3D Mark by the listing price", () => {
    expect(gpuValuePerEuro.label).toBe("G3D Mark per euro");
    expect(gpuValuePerEuro.rate({ gpu, priceEur: 800 })).toMatchObject({
      strategyId: "gpu_value_per_euro",
      value: 20,
      display: "20.0/€",
    });
  });

  it.each([undefined, 0, -5, Number.NaN])("gpuValuePerEuro is null for price %s", (priceEur) => {
    expect(gpuValuePerEuro.rate(priceEur === undefined ? { gpu } : { gpu, priceEur })).toBeNull();
  });

  it("uses ids distinct from the CPU strategies, so one rating list can hold both", () => {
    const cpuIds = createStrategies(cpuSnapshotOf(cpuRow())).map((s) => s.id);
    const gpuIds = createGpuStrategies(snapshotOf(...specs)).map((s) => s.id);
    expect(gpuIds.filter((id) => cpuIds.includes(id))).toEqual([]);
  });
});

describe("gpuPercentile sets", () => {
  const snapshot = snapshotOf(...specs);
  const strategy = gpuPercentile(snapshot);
  const rtx9060Laptop = recordNamed(specs, "GeForce RTX 9060 Laptop GPU");
  const rtx9060 = recordNamed(specs, "GeForce RTX 9060");
  const rate = (gpu: GpuBenchmarkRecord, formFactor?: FormFactor) =>
    strategy.rate(formFactor === undefined ? { gpu } : { gpu, formFactor });

  it("ranks against LaptopGpu for a laptop page, integrated included, and names that set", () => {
    const rating = rate(rtx9060Laptop, "laptop");
    // set [2500, 6700, 16000, 26000]: 16000 beats two and counts itself, inclusive: 3 / 4.
    expect(rating?.value).toBe(75);
    expect(rating?.explanation).toContain("of 4 laptop GPUs");
    expect(rating?.explanation).toContain("first seen 2020 or later");
    expect(rating?.explanation).not.toContain("desktop");
  });

  it("ranks against DesktopGpu for a desktop page, without laptop discrete cards", () => {
    const rating = rate(rtx9060, "desktop");
    // set [1900, 2500, 6700, 19000, 30000, 36000]: 19000 beats three and counts itself: 4 / 6.
    expect(rating?.value).toBeCloseTo((4 / 6) * 100, 9);
    expect(rating?.explanation).toContain("of 6 desktop GPUs");
    expect(rating?.explanation).not.toContain("laptop");
  });

  it("lets the page decide the set, not the record", () => {
    const asLaptop = rate(rtx9060, "laptop");
    const asDesktop = rate(rtx9060, "desktop");
    expect(asLaptop?.explanation).toContain("laptop GPUs");
    expect(asDesktop?.explanation).toContain("desktop GPUs");
    expect(asLaptop?.value).not.toBe(asDesktop?.value);
  });

  it("counts an iGPU that ships in both classes once in each set and a desktop-only iGPU in DesktopGpu only", () => {
    const iris = recordNamed(specs, "Intel Iris Xe");
    const uhd = recordNamed(specs, "Intel UHD Graphics 770");
    expect(rate(iris, "laptop")?.explanation).toContain("of 4 laptop GPUs");
    expect(rate(iris, "desktop")?.explanation).toContain("of 6 desktop GPUs");
    expect(rate(uhd, "laptop")?.explanation).toContain("of 4 laptop GPUs");
    expect(rate(uhd, "desktop")?.value).toBeCloseTo((1 / 6) * 100, 9);
  });

  it("keeps virtual and vGPU records out of both sets, yet rates them when the page asks", () => {
    const vgpu = recordNamed(specs, "A40-12Q");
    expect(rate(vgpu, "laptop")?.explanation).toContain("of 4 laptop GPUs");
    expect(rate(vgpu, "desktop")?.explanation).toContain("of 6 desktop GPUs");
  });

  it("rates nothing without a known form factor", () => {
    expect(rate(rtx9060Laptop)).toBeNull();
    expect(rate(rtx9060Laptop, "unknown")).toBeNull();
  });

  it("applies the cohort policy to both sets", () => {
    const old = recordNamed(specs, "GeForce GTX 1050 Laptop GPU");
    const recent = rate(old, "laptop");
    expect(recent?.value).toBe(25);
    const all = gpuPercentile(snapshot, NO_CUTOFF).rate({ gpu: old, formFactor: "laptop" });
    expect(all?.explanation).toContain("of 5 laptop GPUs");
    expect(all?.explanation).not.toContain("first seen");
    expect(all?.value).toBe(40);
  });

  it("returns null when no record belongs to the page's set", () => {
    const onlyVirtual = gpuPercentile(snapshotOf(specs[9] as Spec));
    expect(onlyVirtual.rate({ gpu: rtx9060, formFactor: "desktop" })).toBeNull();
    expect(onlyVirtual.rate({ gpu: rtx9060, formFactor: "laptop" })).toBeNull();
  });

  it("uses the default policy unless told otherwise", () => {
    const explicit = gpuPercentile(snapshot, DEFAULT_COHORT_POLICY);
    expect(explicit.rate({ gpu: rtx9060Laptop, formFactor: "laptop" })).toEqual(
      rate(rtx9060Laptop, "laptop"),
    );
  });

  it("is monotone in the G3D Mark within a set", () => {
    const cohortScores = fc.array(fc.integer({ min: 1, max: 60_000 }), {
      minLength: 1,
      maxLength: 40,
    });
    fc.assert(
      fc.property(
        cohortScores,
        fc.constantFrom<"laptop" | "desktop">("laptop", "desktop"),
        fc.integer({ min: 1, max: 60_000 }),
        fc.integer({ min: 1, max: 60_000 }),
        (scores, formFactor, a, b) => {
          const cat = formFactor === "laptop" ? "Mobile" : "Desktop";
          const card = (n: number) =>
            formFactor === "laptop" ? `GeForce RTX ${n} Laptop GPU` : `GeForce RTX ${n}`;
          const cohortSnapshot = snapshotOf(
            ...scores.map((g3d, i) => ({ name: card(1000 + i), cat, g3d })),
            { name: card(9998), cat, g3d: Math.min(a, b) },
            { name: card(9999), cat, g3d: Math.max(a, b) },
          );
          const [low, high] = [card(9998), card(9999)].map((name) => {
            const gpu = cohortSnapshot.records.find((r) => r.name === name);
            if (gpu === undefined) throw new Error("probe missing");
            return gpuPercentile(cohortSnapshot).rate({ gpu, formFactor })?.value ?? Number.NaN;
          });
          expect(low).toBeLessThanOrEqual(high as number);
        },
      ),
    );
  });
});

describe("rateGpuMatch", () => {
  const matchSpecs: readonly Spec[] = [
    ...specs,
    { name: "GeForce RTX 9070 Ti 8GB", cat: "Desktop", g3d: 33_000 },
    { name: "GeForce RTX 9070 Ti 16GB", cat: "Desktop", g3d: 33_500 },
  ];
  const snapshot = snapshotOf(...matchSpecs);
  const matcher = createGpuMatcher(snapshot);
  const strategies = createGpuStrategies(snapshot);

  it("rates a matched record as is", () => {
    const result = rateGpuMatch(strategies, matcher.match("RTX 9080", { formFactor: "desktop" }), {
      formFactor: "desktop",
      priceEur: 1_800,
    });
    expect(result).toMatchObject({
      lowerBound: false,
      formFactor: "desktop",
      variants: ["GeForce RTX 9080"],
    });
    expect(result?.ratings.map((r) => r.strategyId)).toEqual([
      "gpu_g3d_score",
      "gpu_value_per_euro",
      "gpu_g3d_percentile",
    ]);
    expect(result?.ratings[0]?.value).toBe(36_000);
    expect(result?.ratings[0]?.explanation).not.toContain("Lower bound");
  });

  it("rates an ambiguous match by its weakest candidate, as gpuScoreBounds does", () => {
    const match = matcher.match("RTX 9070 Ti", { formFactor: "desktop" });
    expect(match.status).toBe("ambiguous");
    const result = rateGpuMatch(strategies, match, { formFactor: "desktop" });
    expect(result?.lowerBound).toBe(true);
    expect(result?.record.name).toBe("GeForce RTX 9070 Ti 8GB");
    expect(result?.ratings[0]?.value).toBe(gpuScoreBounds(match)?.g3dMark.min);
    expect(result?.variants).toEqual(["GeForce RTX 9070 Ti 16GB", "GeForce RTX 9070 Ti 8GB"]);
    for (const rating of result?.ratings ?? []) expect(rating.explanation).toContain("Lower bound");
  });

  it("gives no percentile when the form factor is unknown, but still the scores", () => {
    const result = rateGpuMatch(strategies, matcher.match("RTX 9080"), { priceEur: 1_000 });
    expect(result?.formFactor).toBe("unknown");
    expect(result?.ratings.map((r) => r.strategyId)).toEqual([
      "gpu_g3d_score",
      "gpu_value_per_euro",
    ]);
  });

  it("is null for no_match", () => {
    expect(rateGpuMatch(strategies, { status: "no_match" })).toBeNull();
  });
});

const dataDir = resolve(import.meta.dirname, "../../../data");
const gpuPath = resolve(dataDir, "passmark_gpu.csv");

describe.skipIf(!existsSync(gpuPath))("GPU ratings on PassMark data", () => {
  const snapshot = passmarkGpuSource.parse(readFileSync(gpuPath, "utf8"));
  const matcher = createGpuMatcher(snapshot);
  const strategies = createGpuStrategies(snapshot);
  const rate = (text: string, formFactor: FormFactor, policy?: CohortPolicy) => {
    const found = rateGpuMatch(
      policy === undefined ? strategies : createGpuStrategies(snapshot, policy),
      matcher.match(text, { formFactor }),
      { formFactor },
    );
    if (found === null) throw new Error(`${text} did not match`);
    return found;
  };
  const percentile = (text: string, formFactor: FormFactor, policy?: CohortPolicy) => {
    const rating = rate(text, formFactor, policy).ratings.find(
      (r) => r.strategyId === "gpu_g3d_percentile",
    );
    if (rating === undefined) throw new Error(`${text} has no percentile`);
    return rating;
  };

  it("ranks an RTX 4060 Laptop GPU above Intel UHD Graphics in the laptop cohort", () => {
    const rtx = percentile("NVIDIA GeForce RTX 4060 Laptop GPU", "laptop");
    const uhd = percentile("Intel UHD Graphics", "laptop");
    expect(rtx.value).toBeGreaterThan(uhd.value + 40);
    expect(rtx.value).toBeGreaterThan(60);
    expect(uhd.value).toBeLessThan(25);
    expect(rtx.explanation).toContain("laptop GPUs");
    expect(uhd.explanation).toContain("laptop GPUs");
    expect(rtx.explanation).toContain("first seen 20");
  });

  it("puts a desktop RTX 4090 near the top of the desktop cohort", () => {
    const rtx = percentile("NVIDIA GeForce RTX 4090", "desktop");
    expect(rtx.value).toBeGreaterThan(95);
    expect(rtx.explanation).toContain("desktop GPUs");
    expect(rtx.explanation).not.toContain("laptop");
  });

  it("ranks the same text against the cohort of the page's form factor", () => {
    const desktop = percentile("RTX 4090", "desktop");
    const laptop = percentile("RTX 4090", "laptop");
    expect(desktop.explanation).toContain("desktop GPUs");
    expect(laptop.explanation).toContain("laptop GPUs");
    expect(rate("RTX 4090", "desktop").record.name).not.toBe(
      rate("RTX 4090", "laptop").record.name,
    );
  });

  it("is lower with the default recency cutoff than over the whole history", () => {
    const recent = percentile("NVIDIA GeForce RTX 4060 Laptop GPU", "laptop").value;
    const all = percentile("NVIDIA GeForce RTX 4060 Laptop GPU", "laptop", NO_CUTOFF).value;
    expect(all).toBeGreaterThan(recent);
  });

  it("rates an ambiguous card by its weakest variant and flags it", () => {
    const match = matcher.match("RTX 5060 Ti", { formFactor: "desktop" });
    expect(match.status).toBe("ambiguous");
    const result = rateGpuMatch(strategies, match, { formFactor: "desktop" });
    expect(result?.lowerBound).toBe(true);
    expect(result?.record.g3dMark).toBe(gpuScoreBounds(match)?.g3dMark.min);
  });

  it("gives no percentile for an unknown form factor", () => {
    const result = rateGpuMatch(strategies, matcher.match("RTX 4090", { formFactor: "unknown" }));
    expect(result?.ratings.some((r) => r.strategyId === "gpu_g3d_percentile")).toBe(false);
  });
});
