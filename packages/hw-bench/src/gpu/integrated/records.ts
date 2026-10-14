import type { GpuBenchmarkRecord } from "../../benchmark";

/**
 * Looks a rule's PassMark GPU name up in a snapshot by exact name; null when the snapshot has no such row.
 * Of several rows with one name (PassMark lists duplicates) the best-sampled one wins.
 */
export function createGpuNameLookup(
  records: readonly GpuBenchmarkRecord[],
): (name: string) => GpuBenchmarkRecord | null {
  const byName = new Map<string, GpuBenchmarkRecord>();
  for (const record of records) {
    const known = byName.get(record.name);
    if (known === undefined || (record.samples ?? 0) > (known.samples ?? 0)) {
      byName.set(record.name, record);
    }
  }
  return (name) => byName.get(name) ?? null;
}
