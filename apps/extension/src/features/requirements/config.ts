import { METRIC, type Metric, type NumericControl } from "./model";

/** Slider step per benchmark metric. */
export const MIN_STEPS: Readonly<Record<Metric, number>> = {
  [METRIC.cpuMark]: 500,
  [METRIC.cpuSingle]: 50,
  [METRIC.g3d]: 500,
};

/** Price slider: a result set wider than `wideSpan` euros moves in `wideStep` steps, else in `narrowStep`. */
export const PRICE_STEPS = { wideSpan: 2000, wideStep: 50, narrowStep: 10 } as const;

/** Smallest share of the track between two labelled slider marks. */
export const MARK_LABEL_GAP = 0.16;

/** The numeric requirements offered as sliders, in panel order. */
export const NUMERIC_CONTROLS: readonly NumericControl[] = [
  { facet: "ram_gb", unit: "GB", direction: "min" },
  { facet: "ssd_gb", unit: "GB", direction: "min" },
  { facet: "storage_gb", unit: "GB", direction: "min" },
  { facet: "display_inch", unit: "Zoll", direction: "range" },
  { facet: "refresh_hz", unit: "Hz", direction: "min" },
  { facet: "brightness_nits", unit: "cd/m²", direction: "min" },
  { facet: "weight_kg", unit: "kg", direction: "max" },
  { facet: "battery_h", unit: "h", direction: "min" },
  { facet: "release_year", unit: "", direction: "min" },
];
