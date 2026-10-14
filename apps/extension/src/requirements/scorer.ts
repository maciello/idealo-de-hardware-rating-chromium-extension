import {
  cpuScoreBounds,
  createCanonicalKeyMatcher,
  createGpuMatcher,
  type FormFactor,
  gpuScoreBounds,
} from "@idealo-hw/hw-bench";
import type { FilterGroup, ModelFacet, ModelScorer } from "@idealo-hw/idealo-query";
import type { CpuSnapshot, GpuSnapshot } from "../storage/items";

/** Metric names the requirement sliders and the scorer agree on. */
export const METRIC = { cpuMark: "cpu_mark", cpuSingle: "cpu_single", g3d: "g3d" } as const;
export type Metric = (typeof METRIC)[keyof typeof METRIC];

type Scores = Readonly<Record<string, number>>;

/**
 * Adapter from the imported PassMark snapshots to the planner's ModelScorer. A filter label resolves
 * to the weakest variant it could name (cpuScoreBounds/gpuScoreBounds `min`), so a minimum is never
 * overstated. GPUs are matched as the page's device class (laptop GPUs on Notebooks).
 */
export function createModelScorer(
  cpu: CpuSnapshot | null,
  gpu: GpuSnapshot | null,
  formFactor: FormFactor,
): ModelScorer {
  const cpus = cpu === null ? null : createCanonicalKeyMatcher(cpu);
  const gpus = gpu === null ? null : createGpuMatcher(gpu);
  const cache = new Map<string, Scores | null>();
  const resolve = (facet: ModelFacet, label: string): Scores | null => {
    if (facet === "cpu_model") {
      const bounds = cpus === null ? null : cpuScoreBounds(cpus.matchText(label));
      if (bounds === null) return null;
      return {
        [METRIC.cpuMark]: bounds.cpuMark.min,
        ...(bounds.singleThread === null ? {} : { [METRIC.cpuSingle]: bounds.singleThread.min }),
      };
    }
    const bounds = gpus === null ? null : gpuScoreBounds(gpus.match(label, { formFactor }));
    return bounds === null ? null : { [METRIC.g3d]: bounds.g3dMark.min };
  };
  return (facet, label) => {
    const key = `${facet}\u0000${label}`;
    if (!cache.has(key)) cache.set(key, resolve(facet, label));
    return cache.get(key) ?? null;
  };
}

export interface ScoreSpan {
  min: number;
  max: number;
}

/** Lowest and highest `metric` over the options of a model group that resolve to a model; null when none do. */
export function scoreSpan(
  group: FilterGroup,
  facet: ModelFacet,
  metric: Metric,
  scorer: ModelScorer,
): ScoreSpan | null {
  const values = group.filters.flatMap((option) => {
    const value = scorer(facet, option.label)?.[metric];
    return value === undefined ? [] : [value];
  });
  return values.length === 0 ? null : { min: Math.min(...values), max: Math.max(...values) };
}
