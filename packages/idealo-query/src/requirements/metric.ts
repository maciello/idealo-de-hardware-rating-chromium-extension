/**
 * Benchmark metric names a `ModelScorer` reports and `Requirements.models[*].minimums` is keyed by:
 * PassMark CPU multi-thread, CPU single-thread and G3D (GPU) mark.
 */
export const METRIC = { cpuMark: "cpu_mark", cpuSingle: "cpu_single", g3d: "g3d" } as const;
export type Metric = (typeof METRIC)[keyof typeof METRIC];
