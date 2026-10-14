import type { FilterCatalog, FilterGroup, FilterOption } from "./catalog";

/**
 * What a filter group means, independent of its per-category attribute id (RAM is group 27570 in
 * Notebooks and 19537 in PC-Systeme). Numeric facets carry a canonical unit; model facets name
 * hardware that a benchmark source resolves; label facets are offered as plain choices.
 */
export type NumericFacet =
  | "ram_gb"
  | "ram_mhz"
  | "ssd_gb"
  | "storage_gb"
  | "vram_gb"
  | "display_inch"
  | "refresh_hz"
  | "brightness_nits"
  | "weight_kg"
  | "battery_h"
  | "release_year"
  | "cpu_cores"
  | "cpu_threads"
  | "psu_w";
export type ModelFacet = "cpu_model" | "gpu_model";
export type LabelFacet = "ram_type" | "storage_type" | "device_type";
export type Facet = NumericFacet | ModelFacet | LabelFacet;

interface NumericSpec {
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

type FacetSpec =
  | NumericSpec
  | { readonly kind: "model"; readonly facet: ModelFacet }
  | { readonly kind: "label"; readonly facet: LabelFacet };

const GB = { GB: 1, TB: 1000 } as const;
const numeric = (
  facet: NumericFacet,
  units: Readonly<Record<string, number>>,
  points: NumericSpec["points"] = "exact",
): NumericSpec => ({ kind: "numeric", facet, units, points });

/** German idealo group names (HAR 2026-10-14, categories 3751, 3020, 19116). Extend here only. */
const FACETS_BY_GROUP_NAME: Readonly<Record<string, FacetSpec>> = {
  prozessor: { kind: "model", facet: "cpu_model" },
  grafikkarte: { kind: "model", facet: "gpu_model" },
  ram: numeric("ram_gb", GB),
  "ram typ": { kind: "label", facet: "ram_type" },
  speichertakt: numeric("ram_mhz", { MHz: 1 }),
  "ssd-speicher": numeric("ssd_gb", GB),
  festplattenspeicher: numeric("storage_gb", GB),
  "festplattenkapazität (gb)": numeric("storage_gb", GB),
  "festplattenkapazität (tb)": numeric("storage_gb", GB),
  "interner speicher": numeric("storage_gb", GB),
  festplattentyp: { kind: "label", facet: "storage_type" },
  grafikspeicher: numeric("vram_gb", GB),
  displaygröße: numeric("display_inch", { Zoll: 1 }, "bucket"),
  bildwiederholungsrate: numeric("refresh_hz", { Hz: 1 }),
  helligkeit: numeric("brightness_nits", { "cd/m²": 1 }),
  gewicht: numeric("weight_kg", { kg: 1, g: 0.001 }),
  akkulaufzeit: numeric("battery_h", { h: 1 }),
  markteinführung: numeric("release_year", { "": 1 }),
  "anzahl prozessorkerne": numeric("cpu_cores", { "-Core": 1 }),
  "anzahl threads": numeric("cpu_threads", { "": 1 }),
  netzteil: numeric("psu_w", { Watt: 1, W: 1 }),
  "notebook-typ": { kind: "label", facet: "device_type" },
  "pc-typ": { kind: "label", facet: "device_type" },
};

const groupKey = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, " ");

/** Inclusive `min`; `max` is Infinity for "ab ..." labels and exclusive when `maxExclusive`. */
export interface Interval {
  readonly min: number;
  readonly max: number;
  readonly maxExclusive: boolean;
}

/** Every value in the interval is >= bound. */
export const allAtLeast = (interval: Interval, bound: number): boolean => interval.min >= bound;

/** Every value in the interval is <= bound. */
export const allAtMost = (interval: Interval, bound: number): boolean => interval.max <= bound;

const CORE_WORDS: Readonly<Record<string, number>> = {
  "single-core": 1,
  "dual-core": 2,
  "quad-core": 4,
  "hexa-core": 6,
  "octa-core": 8,
};

/** "1.000" -> 1000, "2,5" -> 2.5. */
const germanNumber = (text: string): number => Number(text.replace(/\./g, "").replace(",", "."));

const NUMBER = String.raw`\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)?`;
const LABEL = new RegExp(
  String.raw`^(?:(bis|unter|ab)\s+)?(${NUMBER})(?:\s+bis\s+(${NUMBER}))?\s*(\S*)$`,
  "i",
);

interface ParsedLabel {
  readonly min: number;
  readonly max: number;
  readonly maxExclusive: boolean;
  readonly point: boolean;
}

function parseLabel(label: string, spec: NumericSpec): ParsedLabel | null {
  const text = label.trim();
  const word = CORE_WORDS[text.toLowerCase()];
  if (word !== undefined && spec.units["-Core"] !== undefined)
    return { min: word, max: word, maxExclusive: false, point: true };
  const match = LABEL.exec(text);
  if (match === null) return null;
  const [, qualifier, first = "", second, unit = ""] = match;
  const factor = Object.entries(spec.units).find(
    ([u]) => u.toLowerCase() === unit.toLowerCase(),
  )?.[1];
  if (factor === undefined) return null;
  const a = germanNumber(first) * factor;
  if (second !== undefined) {
    if (qualifier !== undefined) return null;
    return { min: a, max: germanNumber(second) * factor, maxExclusive: false, point: false };
  }
  switch (qualifier?.toLowerCase()) {
    case "bis":
      return { min: 0, max: a, maxExclusive: false, point: false };
    case "unter":
      return { min: 0, max: a, maxExclusive: true, point: false };
    case "ab":
      return { min: a, max: Number.POSITIVE_INFINITY, maxExclusive: false, point: false };
    default:
      return { min: a, max: a, maxExclusive: false, point: true };
  }
}

export interface FacetOption extends FilterOption {
  /** Null when the label is not a measure ("Shared Memory", "ohne Grafikkarte"). */
  readonly interval: Interval | null;
}

export type FacetGroup =
  | {
      readonly kind: "numeric";
      readonly facet: NumericFacet;
      readonly group: FilterGroup;
      readonly options: readonly FacetOption[];
    }
  | { readonly kind: "model"; readonly facet: ModelFacet; readonly group: FilterGroup }
  | { readonly kind: "label"; readonly facet: LabelFacet; readonly group: FilterGroup };

function numericOptions(group: FilterGroup, spec: NumericSpec): FacetOption[] {
  const parsed = group.filters.map((filter) => ({ filter, label: parseLabel(filter.label, spec) }));
  const pointValues = parsed
    .flatMap(({ label }) => (label?.point ? [label.min] : []))
    .sort((a, b) => a - b);
  return parsed.map(({ filter, label }) => {
    if (label === null) return { ...filter, interval: null };
    if (spec.points === "bucket" && label.point) {
      const next = pointValues.find((v) => v > label.min);
      return {
        ...filter,
        interval: { min: label.min, max: next ?? label.min, maxExclusive: next !== undefined },
      };
    }
    return {
      ...filter,
      interval: { min: label.min, max: label.max, maxExclusive: label.maxExclusive },
    };
  });
}

/**
 * Annotates the catalog's groups with their facet. Groups with an unknown name are omitted; groups
 * sharing a facet (storage split into GB and TB groups) are returned separately in catalog order.
 */
export function facetsOf(catalog: FilterCatalog): FacetGroup[] {
  return catalog.groups.flatMap((group): FacetGroup[] => {
    const spec = FACETS_BY_GROUP_NAME[groupKey(group.name)];
    if (spec === undefined) return [];
    if (spec.kind === "numeric")
      return [{ kind: "numeric", facet: spec.facet, group, options: numericOptions(group, spec) }];
    return [{ ...spec, group }];
  });
}
