import type { ExclusionReason, FlagParam, RedFlag } from "@idealo-hw/deal-rank";
import { formatEuro, formatNumber, formatPercent } from "./format";

const METRIC_LABELS: Readonly<Record<string, string>> = {
  cpu_mark: "CPU Mark",
  cpu_single: "CPU single-thread",
  g3d_mark: "GPU G3D Mark",
  ram_gb: "RAM (GB)",
  ai_memory_gb: "AI memory (GB, estimate)",
  vram_gb: "GPU memory (GB)",
  webcam_mp: "webcam (MP)",
  display_nits: "display brightness (nits)",
  refresh_hz: "refresh rate (Hz)",
  battery_wh: "battery (Wh)",
  ssd_gb: "SSD (GB)",
  shop_trust: "shop trust",
  price: "price",
  weight_kg: "weight (kg)",
  price_vs_30d_low: "price against the 30-day low",
};

const FEATURE_LABELS: Readonly<Record<string, string>> = {
  wifi_7: "Wi-Fi 7",
  mobile_data: "mobile data",
  thunderbolt_usb4: "Thunderbolt or USB4",
  oled: "OLED display",
  matte: "matte display",
  touchscreen: "touchscreen",
  ir_camera: "IR camera",
  dedicated_gpu: "dedicated GPU",
  unified_fast_memory: "unified fast memory",
};

const AGENT_FLAG_TEXT: Readonly<Record<string, string>> = {
  single_channel_ram: "RAM runs in single channel.",
  soldered_ram: "RAM is soldered and cannot be upgraded.",
  keyboard_not_german: "Keyboard layout is not German.",
  keyboard_unverified: "Keyboard layout is not verified.",
  reseller_modified: "The reseller changed the configuration.",
  refurbished: "Refurbished unit.",
  spec_conflict: "Sources disagree on the specs.",
};

const words = (id: string): string => id.replaceAll("_", " ");

export const metricLabel = (key: string, custom: Readonly<Record<string, string>>): string =>
  METRIC_LABELS[key] ?? custom[key] ?? words(key.replace(/^feature:/, ""));

export const featureLabel = (name: string): string => FEATURE_LABELS[name] ?? words(name);

const num = (value: FlagParam | undefined, digits = 1): string =>
  typeof value === "number" ? formatNumber(value, digits) : "unknown";

/** Plain-English line for a red flag. */
export function flagText(flag: RedFlag): string {
  const p = flag.params;
  const known: Readonly<Record<string, () => string>> = {
    low_res_webcam: () => `Webcam resolution is low (${num(p.megapixels)} MP).`,
    dim_display: () => `Display is dim (${num(p.nits, 0)} nits).`,
    small_ssd: () => `SSD is small (${num(p.gb, 0)} GB).`,
    small_battery: () => `Battery is small (${num(p.wh, 0)} Wh).`,
    marketplace_offer: () => `Best offer is a marketplace sale (${p.shop}).`,
    limited_payment: () =>
      `Best offer accepts neither invoice nor card (${p.payments || "none listed"}).`,
    low_trust_shop: () =>
      `Best offer's shop has a low or missing rating (${num(p.rating_avg)} from ${num(p.rating_count, 0)} ratings).`,
    single_offer: () => "Only one offer is listed.",
    trusted_offer_premium: () =>
      `A shop with a rating of 4.0 or more from 100 or more ratings (${p.shop}) costs ${typeof p.delta === "number" ? formatEuro(p.delta) : "more"} extra.`,
    few_benchmark_samples: () =>
      `Few benchmark samples (CPU ${num(p.cpu_samples, 0)}, GPU ${num(p.gpu_samples, 0)}).`,
    no_cpu_benchmark: () => `No CPU benchmark found for "${p.cpu}".`,
    no_gpu_benchmark: () => `No GPU benchmark found for "${p.gpu}".`,
    new_untested: () => `Listed since ${p.listed_since} and not tested yet.`,
    above_30d_low: () =>
      `Best price is ${typeof p.pct_above_low === "number" ? formatPercent(p.pct_above_low) : "?"} above the 30-day low.`,
    badge_inflated: () =>
      `The ${num(p.bargain_badge_pct, 0)} % bargain badge does not match the price: it is at least 3 % above the 30-day low.`,
  };
  const make = known[flag.id];
  if (make !== undefined) return make();
  if (flag.id.startsWith("unverified_")) {
    return `Not checked, value missing: ${words(flag.id.replace("unverified_", ""))}.`;
  }
  return AGENT_FLAG_TEXT[flag.id] ?? `${words(flag.id)}.`;
}

/** Plain-English line for an exclusion reason. */
export function reasonText(reason: ExclusionReason): string {
  const { check, value, threshold } = reason;
  const show = (v: number | string | boolean): string =>
    typeof v === "number" ? formatNumber(v, 2) : String(v);
  if (check === "above_budget_max" || check === "below_budget_min") {
    const side =
      check === "above_budget_max" ? "above the budget maximum" : "below the budget minimum";
    return `Total ${typeof value === "number" ? formatEuro(value) : value} is ${side} of ${typeof threshold === "number" ? formatEuro(threshold) : threshold}.`;
  }
  if (check === "feature") return `Lacks the required feature ${featureLabel(String(value))}.`;
  if (check === "require_dedicated_gpu") return "No dedicated GPU.";
  if (check === "product_types_allowed")
    return `Product type ${value} is not one of: ${String(threshold).replaceAll("|", ", ")}.`;
  const bound = check.endsWith("_min") ? "below the minimum" : "above the maximum";
  const base = check.replace(/_(?:min|max)$/, "");
  const name = metricLabel(base.replace(/^custom_/, ""), {});
  return `${name} ${show(value)} is ${bound} of ${show(threshold)}.`;
}
