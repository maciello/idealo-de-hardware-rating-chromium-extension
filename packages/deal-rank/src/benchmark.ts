export interface CpuBench {
  cpu_mark: number;
  cpu_single: number | null;
  samples: number | null;
  matched: string;
  /** Set by the adapter when the match was ambiguous and the lower bound was used. */
  note?: string;
}

export interface GpuBench {
  g3d_mark: number;
  samples: number | null;
  matched: string;
  integrated: boolean;
  note?: string;
}

/** Port: benchmark data for CPU and GPU text. The adapter owns matching; this package only reads the result. */
export interface BenchmarkLookup {
  cpu(name: string): CpuBench | null;
  /** `gpu` is empty when the candidate states none; the adapter then falls back to the CPU's integrated graphics. */
  gpu(gpu: string, cpu: string | null): GpuBench | null;
}

/** A lookup that knows nothing, for runs without benchmark files. */
export const NO_BENCHMARKS: BenchmarkLookup = {
  cpu: () => null,
  gpu: () => null,
};
