import type { NameRule } from "../membership";

/** GPU names the identity parser does not read but that are PC workstation/AI parts. */
export const GPU_PRO_RULES: readonly NameRule[] = [
  { rule: "nvidia-gb10", result: "desktop", test: /\bgb10\b/ },
  { rule: "radeon-ai-pro", result: "desktop", test: /radeon ai pro/ },
  {
    rule: "radeon-pro-mobile",
    result: "laptop",
    test: /^(?:amd )?radeon pro (?:w\d{4}m|\d{4}m)\b/,
  },
  { rule: "radeon-pro-wx", result: "both", test: /^(?:amd )?radeon pro wx\s?\d{4}/ },
  { rule: "radeon-pro-workstation", result: "desktop", test: /^(?:amd )?radeon pro w\d{4}x?\b/ },
  { rule: "radeon-vega-igpu", result: "both", test: /^(?:amd )?radeon (?:rx )?vega \d{1,2}$/ },
  { rule: "quadro-rtx-3000-mobile-only", result: "laptop", test: /quadro rtx 3000\b/ },
  { rule: "quadro-mobile", result: "laptop", test: /quadro [pkm]\d{3,4}m\b|\(mobile\)/ },
  { rule: "quadro-both-classes", result: "both", test: /\bquadro\b/ },
];
