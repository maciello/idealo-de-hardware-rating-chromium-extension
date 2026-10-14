import type { BenchmarkSnapshot, GpuBenchmarkRecord } from "../../benchmark";
import { type CohortPolicy, createCohort, DEFAULT_COHORT_POLICY } from "../cohort";
import { classifyGpu } from "../device-class";
import { cohortPercentileRating, type Pool, poolOf } from "../percentile";
import type { GpuRatingStrategy } from "../strategy";

export const GPU_PERCENTILE_ID = "gpu_g3d_percentile";

/**
 * Percentile of a GPU's G3D Mark within the page's form factor, against the snapshot records the cohort policy admits.
 * The groups are the overlapping sets of `device-class` (LaptopGpu, DesktopGpu), defined by chip identity and not by
 * PassMark's `cat`: laptop = mobile discrete, mobile workstation and iGPUs of laptop CPUs; desktop = desktop discrete,
 * workstation/AI cards and iGPUs of desktop CPUs (a mini-PC iGPU is in both). Virtual, datacenter, server and phone
 * GPUs are in neither.
 * The pool is chosen by the page, not by the rated record. With an unknown or absent form factor there is no rating:
 * an ambiguous text ("RTX 4060") can be a desktop or a laptop card, and ranking it against the wrong group is the
 * "top 68% of desktop CPUs on a laptop" bug.
 * Sorted arrays are built once here; each `rate` call is a binary search.
 */
export function gpuPercentile(
  snapshot: BenchmarkSnapshot<GpuBenchmarkRecord>,
  policy: CohortPolicy = DEFAULT_COHORT_POLICY,
): GpuRatingStrategy {
  const cohort = createCohort(snapshot.records, (record) => record.g3dMark, policy);
  const limits = { sinceYear: cohort.sinceYear, minScore: cohort.minScore };
  const marks: Record<"laptop" | "desktop", number[]> = { laptop: [], desktop: [] };
  for (const record of snapshot.records) {
    if (!cohort.includes(record)) continue;
    const membership = classifyGpu(record.name);
    if (membership.laptop) marks.laptop.push(record.g3dMark);
    if (membership.desktop) marks.desktop.push(record.g3dMark);
  }
  const pools: Readonly<Record<"laptop" | "desktop", Pool>> = {
    laptop: poolOf(marks.laptop, "laptop"),
    desktop: poolOf(marks.desktop, "desktop"),
  };

  return {
    id: GPU_PERCENTILE_ID,
    label: "G3D percentile within form factor",
    rate({ gpu, formFactor }) {
      if (formFactor === undefined || formFactor === "unknown") return null;
      const pool = pools[formFactor];
      return cohortPercentileRating({
        strategyId: GPU_PERCENTILE_ID,
        metric: "g3d_mark",
        score: gpu.g3dMark,
        sorted: pool.sorted,
        group: pool.group,
        cohort: limits,
      });
    },
  };
}
