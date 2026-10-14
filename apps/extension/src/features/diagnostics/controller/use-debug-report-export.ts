import { useState } from "react";
import { downloadJson } from "../../../platform/download";
import { type ErrorSource, recordError } from "../../../platform/errors";
import type { TargetTab } from "../../../platform/tabs";
import { collectDebugReport } from "../adapters/collect-debug-report";
import { DIAGNOSTICS_COPY } from "../copy";

export interface DebugReportExport {
  busy: boolean;
  /** Outcome of the last export; null before the first one. */
  note: string | null;
  exportReport(): void;
}

/**
 * Saves the debug report through the shared download path. `resolveTab` runs when the user clicks,
 * so the report describes the idealo tab as it is then.
 */
export function useDebugReportExport(
  source: ErrorSource,
  resolveTab: () => Promise<TargetTab | null>,
): DebugReportExport {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const exportReport = async (): Promise<void> => {
    setBusy(true);
    setNote(null);
    try {
      const report = await collectDebugReport(await resolveTab());
      setNote(DIAGNOSTICS_COPY.saved(downloadJson("debug-report", { ...report })));
    } catch (cause) {
      void recordError(source, cause);
      setNote(DIAGNOSTICS_COPY.failed);
    } finally {
      setBusy(false);
    }
  };

  return { busy, note, exportReport: () => void exportReport() };
}
