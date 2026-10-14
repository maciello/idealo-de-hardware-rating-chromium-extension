import type { BenchmarkSnapshot, BenchmarkSource } from "@idealo-hw/hw-bench";
import type { StoredItem } from "../../../platform/storage/use-storage-item";

/** Reads a dropped file, parses it with the PassMark source and stores the snapshot. */
export async function importBenchmarkFile<R>(
  file: File,
  source: BenchmarkSource<R>,
  item: StoredItem<BenchmarkSnapshot<R> | null>,
): Promise<void> {
  const parsed = source.parse(await file.text(), { importedAt: new Date().toISOString() });
  await item.setValue(parsed);
}
