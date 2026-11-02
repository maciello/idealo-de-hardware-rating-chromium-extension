import type { DealReport, RankedCandidate } from "@idealo-hw/deal-rank";
import { formatEuro, formatNumber } from "./format";

interface Column {
  header: string;
  /** null when the candidate has no value for this column. */
  cell: (r: RankedCandidate) => string | null;
}

export const cellText = (text: string): string => text.replaceAll("|", "\\|");

const metricCell =
  (key: string, digits = 1) =>
  (r: RankedCandidate): string | null => {
    const value = r.metrics[key];
    return value === undefined ? null : formatNumber(value, digits);
  };

const withScore = (text: string | null, mark: number | undefined): string | null =>
  text === null ? null : mark === undefined ? text : `${text} (${formatNumber(mark, 0)})`;

/** Columns shown only when some top candidate has a value; AI memory only when above zero. */
function optionalColumns(report: DealReport): Column[] {
  const custom = report.custom_metrics
    .filter((metric) => report.weighted_metrics.includes(metric.key))
    .map((metric): Column => ({ header: metric.label, cell: metricCell(metric.key, 2) }));
  return [
    { header: "CPU (CPU Mark)", cell: (r) => withScore(r.cpu, r.cpu_benchmark?.cpu_mark) },
    { header: "GPU (G3D)", cell: (r) => withScore(r.gpu, r.gpu_benchmark?.g3d_mark) },
    { header: "RAM (GB)", cell: metricCell("ram_gb") },
    {
      header: "AI memory (GB, est.)",
      cell: (r) => ((r.metrics.ai_memory_gb ?? 0) > 0 ? metricCell("ai_memory_gb")(r) : null),
    },
    { header: "Webcam (MP)", cell: metricCell("webcam_mp") },
    { header: "Nits", cell: metricCell("display_nits", 0) },
    { header: "Hz", cell: metricCell("refresh_hz", 0) },
    { header: "Wh", cell: metricCell("battery_wh", 0) },
    { header: "kg", cell: metricCell("weight_kg", 2) },
    ...custom,
  ];
}

/** The top-N table as markdown. */
export function topTable(report: DealReport): string {
  const top = report.ranked.slice(0, report.top_n);
  const columns: Column[] = [
    { header: "#", cell: (r) => String(r.rank) },
    { header: "Product", cell: (r) => `[${cellText(r.name)}](${r.url})` },
    { header: "Total", cell: (r) => formatEuro(r.best_offer.total_eur) },
    { header: "Score", cell: (r) => formatNumber(r.score, 1) },
    ...optionalColumns(report).filter((column) => top.some((r) => column.cell(r) !== null)),
  ];
  const row = (cells: readonly string[]): string => `| ${cells.join(" | ")} |`;
  return [
    row(columns.map((c) => c.header)),
    row(columns.map(() => "---")),
    ...top.map((r) => row(columns.map((c) => c.cell(r) ?? "-"))),
  ].join("\n");
}
