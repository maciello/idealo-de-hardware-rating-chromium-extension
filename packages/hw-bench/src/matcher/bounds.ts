import type { CpuBenchmarkRecord, GpuBenchmarkRecord } from "../benchmark";
import type { FreeTextMatchResult, MatchResult } from "./matcher";

export interface ScoreRange {
  readonly min: number;
  readonly max: number;
}

export interface CpuScoreBounds {
  /** Names of the records the range spans, ordered as the match result lists them; one entry for a single match. */
  readonly variants: readonly string[];
  readonly cpuMark: ScoreRange;
  /** null when any variant has no single-thread score, since no minimum can then be guaranteed. */
  readonly singleThread: ScoreRange | null;
}

export interface GpuScoreBounds {
  readonly variants: readonly string[];
  readonly g3dMark: ScoreRange;
}

const rangeOf = (values: readonly number[]): ScoreRange => ({
  min: Math.min(...values),
  max: Math.max(...values),
});

const recordsOf = <R>(result: FreeTextMatchResult<R>): readonly R[] => {
  if (result.status === "matched") return [result.record];
  return result.status === "ambiguous" ? result.candidates : [];
};

/**
 * Score range of everything a CPU match result could be: a matched record gives min = max, an ambiguous result
 * (Apple "M4 Pro" = 12 or 14 core) spans all its candidates, no_match gives null. A threshold filter that needs
 * a guarantee compares against `min`; one that wants to exclude only certain failures compares against `max`.
 */
export function cpuScoreBounds(
  result: FreeTextMatchResult<CpuBenchmarkRecord>,
): CpuScoreBounds | null {
  const records = recordsOf(result);
  if (records.length === 0) return null;
  const single = records.map((record) => record.singleThreadMark);
  return {
    variants: records.map((record) => record.name),
    cpuMark: rangeOf(records.map((record) => record.cpuMark)),
    singleThread: single.every((mark) => mark !== null) ? rangeOf(single as number[]) : null,
  };
}

/** GPU counterpart of `cpuScoreBounds` (RTX 5060 Ti = 8GB or 16GB card), over G3D Mark. */
export function gpuScoreBounds(result: MatchResult<GpuBenchmarkRecord>): GpuScoreBounds | null {
  const records = recordsOf(result);
  if (records.length === 0) return null;
  return {
    variants: records.map((record) => record.name),
    g3dMark: rangeOf(records.map((record) => record.g3dMark)),
  };
}
