export type BenchmarkKind = "cpu" | "gpu";

export type CpuSegment = "desktop" | "laptop" | "server" | "mobile_embedded" | "unknown";
export type GpuSegment = "desktop" | "mobile" | "workstation" | "unknown";

export interface ReleaseDate {
  readonly year: number;
  /** 1-12 */
  readonly month: number;
}

export interface CpuBenchmarkRecord {
  /** PassMark CPU id. Unique together with `socketCount`. */
  readonly id: number;
  readonly name: string;
  /** Multi-thread score (PassMark "CPU Mark"). */
  readonly cpuMark: number;
  /** Single-thread score. */
  readonly singleThreadMark: number | null;
  /** Primary (performance) cores. */
  readonly cores: number | null;
  readonly threadsPerCore: number | null;
  /** Secondary (efficiency) cores. */
  readonly efficiencyCores: number | null;
  readonly efficiencyThreadsPerCore: number | null;
  /** CPUs per system (PassMark `cpuCount`); 1 unless a multi-socket result. */
  readonly socketCount: number;
  readonly baseClockMhz: number | null;
  readonly turboClockMhz: number | null;
  readonly tdpWatts: number | null;
  /** PassMark reference price in USD; not usable as a EUR price. */
  readonly priceUsd: number | null;
  readonly socket: string | null;
  readonly segments: readonly CpuSegment[];
  readonly released: ReleaseDate | null;
  readonly rank: number | null;
  readonly samples: number | null;
}

export interface GpuBenchmarkRecord {
  readonly id: number;
  readonly name: string;
  /** PassMark G3D Mark. */
  readonly g3dMark: number;
  readonly g2dMark: number | null;
  readonly segments: readonly GpuSegment[];
  readonly released: ReleaseDate | null;
  /** null when PassMark reports "Insufficient data". */
  readonly rank: number | null;
  readonly samples: number | null;
  readonly tdpWatts: number | null;
  readonly priceUsd: number | null;
  readonly bus: string | null;
  readonly memorySizeMb: number | null;
  readonly memoryClockMhz: number | null;
  readonly coreClockMhz: number | null;
}

export const totalCores = (cpu: CpuBenchmarkRecord): number | null =>
  cpu.cores === null ? null : cpu.cores + (cpu.efficiencyCores ?? 0);

export const totalThreads = (cpu: CpuBenchmarkRecord): number | null =>
  cpu.cores === null || cpu.threadsPerCore === null
    ? null
    : cpu.cores * cpu.threadsPerCore +
      (cpu.efficiencyCores ?? 0) * (cpu.efficiencyThreadsPerCore ?? 1);
