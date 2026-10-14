import { CpuSnapshotSchema, GpuSnapshotSchema } from "../../../contracts";
import { cpuSnapshotItem, gpuSnapshotItem } from "../../../platform/storage";
import { openOptions } from "../../../platform/tabs";
import { formatInteger, formatShortDate } from "../../../ui";
import { SUMMARY_COPY } from "../copy";
import { useBenchmarkSnapshot } from "./use-benchmark-snapshot";

export interface BenchmarkSummaryModel {
  text: string;
  onImport(): void;
}

/** One line describing the imported CPU and GPU data, plus the way to the import page. */
export function useBenchmarkSummary(): BenchmarkSummaryModel {
  const cpu = useBenchmarkSnapshot(cpuSnapshotItem, CpuSnapshotSchema);
  const gpu = useBenchmarkSnapshot(gpuSnapshotItem, GpuSnapshotSchema);
  const imported = formatShortDate(cpu?.importedAt ?? gpu?.importedAt);
  const parts = [
    cpu ? SUMMARY_COPY.cpu(formatInteger(cpu.records.length)) : null,
    gpu ? SUMMARY_COPY.gpu(formatInteger(gpu.records.length)) : null,
  ].filter((part) => part !== null);
  const text =
    parts.length === 0
      ? SUMMARY_COPY.empty
      : `${parts.join(" · ")}${imported ? SUMMARY_COPY.imported(imported) : ""}`;
  return { text, onImport: openOptions };
}
