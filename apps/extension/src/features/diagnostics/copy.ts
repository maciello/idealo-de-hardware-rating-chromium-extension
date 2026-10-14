export const DIAGNOSTICS_COPY = {
  // Options card
  cardTitle: "Diagnostics",
  description:
    "Saves a small file for bug reports: extension version, settings, benchmark data counts, the last AI test, recent errors and, for your open idealo tab, how many products were found and rated. It contains no API keys, benchmark records or page content.",

  // Popup row
  rowLabel: "Diagnostics",

  exportReport: "Export debug report",
  saved: (filename: string) => `Saved ${filename}`,
  failed: "Could not create the report.",

  // Page section of the report
  noTab: "No idealo tab was open.",
  unreadableReport: "The page answered with an unreadable report.",
  noAnswer: "The idealo tab did not answer; reload it and try again.",
} as const;
