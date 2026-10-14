import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type BenchmarkSnapshot,
  type CohortPolicy,
  createGpuMatcher,
  createGpuStrategies,
  type FormFactor,
  type GpuBenchmarkRecord,
  type GpuMatcher,
  type GpuRatingStrategy,
  gpuScoreBounds,
  passmarkGpuSource,
  rateGpuMatch,
} from "../../../src";
import { dataPath, haveData } from "../../data";
import { NO_CUTOFF, type Spec, snapshotOf, specs } from "./fixtures";

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

describe.skipIf(!haveData("passmark_gpu.csv"))("GPU ratings on PassMark data", () => {
  let snapshot: BenchmarkSnapshot<GpuBenchmarkRecord>;
  let matcher: GpuMatcher;
  let strategies: readonly GpuRatingStrategy[];

  beforeAll(() => {
    snapshot = passmarkGpuSource.parse(readFileSync(dataPath("passmark_gpu.csv"), "utf8"));
    matcher = createGpuMatcher(snapshot);
    strategies = createGpuStrategies(snapshot);
  });

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
