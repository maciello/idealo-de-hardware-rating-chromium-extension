import type {
  BenchmarkSnapshot,
  CpuBenchmarkRecord,
  GpuBenchmarkRecord,
} from "@idealo-hw/hw-bench";
import { storage } from "@wxt-dev/storage";
import { CpuSnapshotSchema, GpuSnapshotSchema, type Settings, SettingsSchema } from "./schemas";

export type CpuSnapshot = BenchmarkSnapshot<CpuBenchmarkRecord>;
export type GpuSnapshot = BenchmarkSnapshot<GpuBenchmarkRecord>;

export const cpuSnapshotItem = storage.defineItem<CpuSnapshot | null>("local:cpuSnapshot", {
  fallback: null,
  version: 1,
});

export const gpuSnapshotItem = storage.defineItem<GpuSnapshot | null>("local:gpuSnapshot", {
  fallback: null,
  version: 1,
});

/** `null` until the user saves settings; consumers resolve it against the strategy catalog. */
export const settingsItem = storage.defineItem<Settings | null>("local:settings", {
  fallback: null,
  version: 1,
});

export const captureModeItem = storage.defineItem<boolean>("local:captureMode", {
  fallback: false,
  version: 1,
});

export async function loadCpuSnapshot(): Promise<CpuSnapshot | null> {
  const parsed = CpuSnapshotSchema.safeParse(await cpuSnapshotItem.getValue());
  return parsed.success ? parsed.data : null;
}

export async function loadGpuSnapshot(): Promise<GpuSnapshot | null> {
  const parsed = GpuSnapshotSchema.safeParse(await gpuSnapshotItem.getValue());
  return parsed.success ? parsed.data : null;
}

/** Stored settings re-validated on read; null when never saved or unreadable. */
export async function loadSettings(): Promise<Settings | null> {
  const parsed = SettingsSchema.safeParse(await settingsItem.getValue());
  return parsed.success ? parsed.data : null;
}
