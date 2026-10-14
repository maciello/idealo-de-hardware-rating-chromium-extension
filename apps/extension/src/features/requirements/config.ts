import { METRIC, type Metric } from "@idealo-hw/idealo-query";
import type { NumericControl } from "./model";

/** Slider step per benchmark metric. */
export const MIN_STEPS: Readonly<Record<Metric, number>> = {
  [METRIC.cpuMark]: 500,
  [METRIC.cpuSingle]: 50,
  [METRIC.g3d]: 500,
};

/** Price slider: a result set wider than `wideSpan` euros moves in `wideStep` steps, else in `narrowStep`. */
export const PRICE_STEPS = { wideSpan: 2000, wideStep: 50, narrowStep: 10 } as const;

/** Gigabytes from which a size reads in terabytes. */
export const GB_PER_TB = 1000;

/** Smallest share of the track between two labelled slider marks. */
export const MARK_LABEL_GAP = 0.16;

/** The numeric requirements offered as sliders, in panel order; graphics memory follows the GPU block it belongs to. */
export const NUMERIC_CONTROLS: readonly NumericControl[] = [
  { facet: "vram_gb", unit: "gigabyte", direction: "min" },
  { facet: "ram_gb", unit: "gigabyte", direction: "min" },
  { facet: "ssd_gb", unit: "gigabyte", direction: "min" },
  { facet: "storage_gb", unit: "gigabyte", direction: "min" },
  { facet: "display_inch", unit: "inch", direction: "range" },
  { facet: "refresh_hz", unit: "hertz", direction: "min" },
  { facet: "brightness_nits", unit: "nits", direction: "min" },
  { facet: "weight_kg", unit: "kilogram", direction: "max" },
  { facet: "battery_h", unit: "hours", direction: "min" },
  { facet: "release_year", unit: "plain", direction: "min" },
];
