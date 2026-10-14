import type { CutoffKind } from "./model";

export const SETTINGS_COPY = {
  // Strategies card
  strategiesTitle: "Rating strategies",
  strategiesDescription:
    "Every enabled strategy renders in the badge, side by side, so you can compare them.",

  // Cohort controls
  cohortTitle: "Percentile cohort",
  cohortDescription:
    '"Percentile within segment" ranks a CPU against other CPUs first seen on PassMark in this period; older chips would otherwise inflate every new CPU\'s rank.',
  cutoffChoices: [
    { value: "none", label: "All years" },
    { value: "since_year", label: "Since year" },
    { value: "rolling", label: "Last N years" },
  ] satisfies readonly { value: CutoffKind; label: string }[],
  firstYear: "First year",
  yearsBack: "Years back from the newest CPU in the data",
  minScore: "Minimum CPU Mark (optional)",
  minScorePlaceholder: "No minimum",

  // Popup row
  primaryLabel: "Primary number",
} as const;
