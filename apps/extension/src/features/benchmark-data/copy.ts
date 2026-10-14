export const IMPORT_COPY = {
  cpuTitle: "PassMark CPU data",
  gpuTitle: "PassMark GPU data",
  drop: (kind: "cpu" | "gpu") =>
    `Drop PassMark ${kind.toUpperCase()} file (.json / .csv) or click to choose`,
  rejectedFileType: "Only .json or .csv files are accepted.",
  failed: (fileName: string, message: string) => `Could not import ${fileName}: ${message}`,
  recordsImported: "records imported",
  rowsRejected: "rows rejected",
  importedAt: (importedAt: string | null, sourceId: string) =>
    `Imported ${importedAt ?? "at unknown time"} (${sourceId})`,
  clear: "Clear",
  empty: "No data imported yet.",
} as const;

export const SUMMARY_COPY = {
  label: "Benchmark data",
  empty: "Nothing imported yet",
  cpu: (count: string) => `CPU ${count}`,
  gpu: (count: string) => `GPU ${count}`,
  imported: (date: string) => ` (imported ${date})`,
  importButton: "Import",
} as const;
