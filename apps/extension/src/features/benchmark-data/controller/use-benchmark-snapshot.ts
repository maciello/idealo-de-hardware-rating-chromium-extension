import type { BenchmarkSnapshot } from "@idealo-hw/hw-bench";
import { useMemo } from "react";
import type { z } from "zod";
import { type StoredItem, useStorageItem } from "../../../platform/storage/use-storage-item";

/** Live snapshot of a storage item, re-validated on every read (storage is a trust boundary). */
export function useBenchmarkSnapshot<R>(
  item: StoredItem<BenchmarkSnapshot<R> | null>,
  schema: z.ZodType<BenchmarkSnapshot<R>>,
): BenchmarkSnapshot<R> | null {
  const [stored] = useStorageItem(item);
  return useMemo(() => {
    const parsed = schema.safeParse(stored);
    return parsed.success ? parsed.data : null;
  }, [stored, schema]);
}
