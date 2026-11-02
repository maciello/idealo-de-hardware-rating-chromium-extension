import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type BenchmarkSnapshot,
  type CpuBenchmarkRecord,
  type GpuBenchmarkRecord,
  passmarkCpuSource,
  passmarkGpuSource,
} from "@idealo-hw/hw-bench";

export interface Snapshots {
  cpu: BenchmarkSnapshot<CpuBenchmarkRecord> | null;
  gpu: BenchmarkSnapshot<GpuBenchmarkRecord> | null;
  warnings: string[];
}

const EXTENSIONS = ["json", "csv"];

const findFile = (dir: string, stem: string): string | null =>
  EXTENSIONS.map((ext) => join(dir, `${stem}.${ext}`)).find((path) => existsSync(path)) ?? null;

function load<R>(
  path: string | null,
  parse: (text: string) => BenchmarkSnapshot<R>,
  warnings: string[],
): BenchmarkSnapshot<R> | null {
  if (path === null) return null;
  const snapshot = parse(readFileSync(path, "utf8"));
  if (snapshot.rejected.length > 0) {
    warnings.push(`${path}: ${snapshot.rejected.length} rows skipped`);
  }
  return snapshot;
}

/** Loads passmark_cpu and passmark_gpu (.json or .csv) from a directory; a missing file becomes a warning. */
export function loadSnapshots(dir: string): Snapshots {
  if (!existsSync(dir)) throw new Error(`passmark directory not found: ${dir}`);
  const warnings: string[] = [];
  const cpuPath = findFile(dir, "passmark_cpu");
  const gpuPath = findFile(dir, "passmark_gpu");
  if (cpuPath === null)
    warnings.push(`no passmark_cpu.json or .csv in ${dir}: CPU scores unavailable`);
  if (gpuPath === null)
    warnings.push(`no passmark_gpu.json or .csv in ${dir}: GPU scores unavailable`);
  return {
    cpu: load(cpuPath, (text) => passmarkCpuSource.parse(text), warnings),
    gpu: load(gpuPath, (text) => passmarkGpuSource.parse(text), warnings),
    warnings,
  };
}
