import type { NumericFacet } from "@idealo-hw/idealo-query";

export const REQUIREMENTS_COPY = {
  heading: "Requirements",

  cpuMarkLabel: "Multi-thread (CPU Mark)",
  cpuSingleLabel: "Single-thread",
  g3dLabel: "3D (G3D Mark)",
  combineAnd: "and",
  combineOr: "or",
  combineAria: "Combine CPU minimums",
  noCpuData: "Import PassMark CPU data in the settings to filter by CPU score.",
  noGpuData: "Import PassMark GPU data in the settings to filter by 3D score.",

  /** Value text of a slider with no restriction set. */
  any: "any",
  /** Label of a minimum slider ("Multi-thread (CPU Mark) ≥"). */
  atLeast: (label: string): string => `${label} ≥`,
  /** Label of a numeric slider: "≥" for a minimum, "≤" for a maximum. */
  bounded: (label: string, isMin: boolean): string => `${label} ${isMin ? "≥" : "≤"}`,
  rangeFrom: (label: string): string => `${label} from`,
  rangeTo: (label: string): string => `${label} to`,
  upTo: (value: string): string => `≤ ${value}`,
  from: (value: string): string => `≥ ${value}`,
  between: (low: string, high: string): string => `${low} – ${high}`,

  numericLabels: {
    ram_gb: "RAM",
    ssd_gb: "SSD",
    storage_gb: "Storage",
    display_inch: "Display size",
    refresh_hz: "Refresh rate",
    brightness_nits: "Brightness",
    weight_kg: "Weight",
    battery_h: "Battery",
    release_year: "Release year",
  } as Readonly<Record<NumericFacet, string>>,

  price: {
    label: "Price",
    thumbFrom: "Price from",
    thumbTo: "Price to",
    euro: (value: string): string => `${value} €`,
    upTo: (value: string): string => `up to ${value}`,
    from: (value: string): string => `from ${value}`,
    between: (low: string, high: string): string => `${low} – ${high}`,
  },

  ramType: {
    label: "RAM type",
    unavailable: "idealo has no RAM-type filter here",
  },

  status: {
    notFilterable: "not filterable here",
    everyOption: "every option meets this",
    noOption: "no listed option meets this",
    options: (n: number): string => `${n} ${n === 1 ? "option" : "options"}`,
    partly: (n: number): string => `, ${n} partly`,
    cap: (noun: string): string => `100-option cap: unlisted ${noun} excluded`,
    joined: (main: string, cap: string): string => `${main} · ${cap}`,
    modelNouns: { cpu_model: "CPUs", gpu_model: "GPUs" } as Readonly<Record<string, string>>,
  },
} as const;
