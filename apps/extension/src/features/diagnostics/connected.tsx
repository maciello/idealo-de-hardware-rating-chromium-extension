import { findTargetTab, type TargetTab } from "../../platform/tabs";
import { useDebugReportExport } from "./controller/use-debug-report-export";
import { DiagnosticsCard } from "./view/DiagnosticsCard";
import { DiagnosticsRow } from "./view/DiagnosticsRow";

/** Options-page card: exports the debug report for the most recent idealo tab. */
export function DiagnosticsConnectedCard() {
  const report = useDebugReportExport("options", findTargetTab);
  return <DiagnosticsCard busy={report.busy} note={report.note} onExport={report.exportReport} />;
}

/** Popup row: exports the debug report for the tab the popup is open on. */
export function DiagnosticsConnectedRow({ tab }: { tab: TargetTab | null }) {
  const report = useDebugReportExport("popup", async () => tab);
  return <DiagnosticsRow note={report.note} onExport={report.exportReport} />;
}
