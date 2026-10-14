/**
 * What a filter group means, independent of its per-category attribute id (RAM is group 27570 in
 * Notebooks and 19537 in PC-Systeme). Numeric facets carry a canonical unit; model facets name
 * hardware that a benchmark source resolves; label facets are offered as plain choices.
 */
export const NUMERIC_FACETS = [
  "ram_gb",
  "ram_mhz",
  "ssd_gb",
  "storage_gb",
  "vram_gb",
  "display_inch",
  "refresh_hz",
  "brightness_nits",
  "weight_kg",
  "battery_h",
  "release_year",
  "cpu_cores",
  "cpu_threads",
  "psu_w",
] as const;
export const MODEL_FACETS = ["cpu_model", "gpu_model"] as const;
export const LABEL_FACETS = ["ram_type", "storage_type", "device_type"] as const;
export type NumericFacet = (typeof NUMERIC_FACETS)[number];
export type ModelFacet = (typeof MODEL_FACETS)[number];
export type LabelFacet = (typeof LABEL_FACETS)[number];
export type Facet = NumericFacet | ModelFacet | LabelFacet;

export interface NumericSpec {
  readonly kind: "numeric";
  readonly facet: NumericFacet;
  /** Unit word -> factor to the canonical unit; "" accepts a bare number. */
  readonly units: Readonly<Record<string, number>>;
  /**
   * "bucket": a bare value covers everything up to the group's next larger value ("14 Zoll" =
   * 14.0-14.9 when "15 Zoll" follows). "exact": a bare value is that value.
   */
  readonly points: "exact" | "bucket";
}

export type FacetSpec =
  | NumericSpec
  | { readonly kind: "model"; readonly facet: ModelFacet }
  | { readonly kind: "label"; readonly facet: LabelFacet };
