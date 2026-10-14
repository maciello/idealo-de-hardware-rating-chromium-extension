import type { FacetSpec, NumericFacet, NumericSpec } from "./model";

const GB = { GB: 1, TB: 1000 } as const;
const numeric = (
  facet: NumericFacet,
  units: Readonly<Record<string, number>>,
  points: NumericSpec["points"] = "exact",
): NumericSpec => ({ kind: "numeric", facet, units, points });

/** German idealo group names (HAR 2026-10-14, categories 3751, 3020, 19116). Extend here only. */
export const FACETS_BY_GROUP_NAME: Readonly<Record<string, FacetSpec>> = {
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
