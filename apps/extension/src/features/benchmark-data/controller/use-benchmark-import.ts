import {
  BenchmarkFormatError,
  type BenchmarkSnapshot,
  type BenchmarkSource,
} from "@idealo-hw/hw-bench";
import { useState } from "react";
import type { z } from "zod";
import type { StoredItem } from "../../../platform/storage/use-storage-item";
import { importBenchmarkFile } from "../adapters/import-pipeline";
import { IMPORT_COPY } from "../copy";
import { useBenchmarkSnapshot } from "./use-benchmark-snapshot";

export interface BenchmarkImportInput<R> {
  source: BenchmarkSource<R>;
  item: StoredItem<BenchmarkSnapshot<R> | null>;
  schema: z.ZodType<BenchmarkSnapshot<R>>;
}

export interface BenchmarkImport<R> {
  snapshot: BenchmarkSnapshot<R> | null;
  error: string | null;
  onFile(file: File): void;
  onReject(): void;
  onClear(): void;
}

export function useBenchmarkImport<R>({
  source,
  item,
  schema,
}: BenchmarkImportInput<R>): BenchmarkImport<R> {
  const snapshot = useBenchmarkSnapshot(item, schema);
  const [error, setError] = useState<string | null>(null);

  const importFile = async (file: File): Promise<void> => {
    setError(null);
    try {
      await importBenchmarkFile(file, source, item);
    } catch (cause) {
      setError(
        cause instanceof BenchmarkFormatError
          ? cause.message
          : IMPORT_COPY.failed(file.name, cause instanceof Error ? cause.message : String(cause)),
      );
    }
  };

  return {
    snapshot,
    error,
    onFile: (file) => void importFile(file),
    onReject: () => setError(IMPORT_COPY.rejectedFileType),
    onClear: () => void item.removeValue(),
  };
}
