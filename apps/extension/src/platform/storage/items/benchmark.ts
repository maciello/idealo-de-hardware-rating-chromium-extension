import { storage } from "@wxt-dev/storage";
import {
  type CpuSnapshot,
  CpuSnapshotSchema,
  type GpuSnapshot,
  GpuSnapshotSchema,
} from "../../../contracts";

export const cpuSnapshotItem = storage.defineItem<CpuSnapshot | null>("local:cpuSnapshot", {
  fallback: null,
  version: 1,
});

export const gpuSnapshotItem = storage.defineItem<GpuSnapshot | null>("local:gpuSnapshot", {
  fallback: null,
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
