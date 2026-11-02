export const HIGHER_IS_BETTER = [
  "cpu_mark",
  "cpu_single",
  "g3d_mark",
  "ram_gb",
  "ai_memory_gb",
  "vram_gb",
  "webcam_mp",
  "display_nits",
  "refresh_hz",
  "battery_wh",
  "ssd_gb",
  "shop_trust",
] as const;

export const LOWER_IS_BETTER = ["price", "weight_kg", "price_vs_30d_low"] as const;

export const METRICS = [...HIGHER_IS_BETTER, ...LOWER_IS_BETTER] as const;

export type Metric = (typeof METRICS)[number];

export const isBuiltinMetric = (key: string): key is Metric =>
  METRICS.some((metric) => metric === key);

/** Metric values by key: built-in metrics, the candidate's `extra` figures and 0/1 feature metrics. A missing value is absent. */
export type MetricValues = Record<string, number>;

export interface MetricDef {
  key: string;
  lower: boolean;
}

export interface CustomMetric {
  key: string;
  direction: "higher" | "lower";
}

const lower = new Set<string>(LOWER_IS_BETTER);

/** Built-in metrics in contract order, then the declared custom metrics. */
export const metricDefs = (customs: readonly CustomMetric[]): MetricDef[] => [
  ...METRICS.map((key) => ({ key, lower: lower.has(key) })),
  ...customs.map(({ key, direction }) => ({ key, lower: direction === "lower" })),
];
