import type { Candidate } from "./candidate";

/** Laptop features derived from the spec text, as opposed to the free-form `features` an agent lists. */
const DERIVED_FEATURES = [
  "wifi_7",
  "mobile_data",
  "thunderbolt_usb4",
  "oled",
  "matte",
  "touchscreen",
  "ir_camera",
  "dedicated_gpu",
  "unified_fast_memory",
] as const;

type Derived = (typeof DERIVED_FEATURES)[number];

/** What feature detection reads; Evaluated satisfies it. */
export interface FeatureInput {
  candidate: Candidate;
  dedicatedGpu: boolean | null;
  unifiedFast: boolean;
}

const hasWord = (words: readonly string[], ...needles: string[]): boolean =>
  words.some((word) => needles.some((needle) => word.toLowerCase().includes(needle)));

const NO_MOBILE_DATA = /^(?:nein|no|none|-)?$/i;

function has(item: FeatureInput, feature: Derived): boolean {
  const { candidate } = item;
  switch (feature) {
    case "wifi_7":
      return /11be|\bbe\b|wi-?fi\s*7/i.test(candidate.wifi_standard ?? "");
    case "mobile_data":
      return !NO_MOBILE_DATA.test((candidate.mobile_data ?? "").trim());
    case "thunderbolt_usb4":
      return /thunderbolt|usb\s*-?4/i.test(
        `${candidate.ports_text ?? ""} ${candidate.video_outputs ?? ""}`,
      );
    case "oled":
      return hasWord(candidate.display.panel, "oled");
    case "matte":
      return hasWord(candidate.display.panel, "matt", "entspiegelt");
    case "touchscreen":
      return hasWord(candidate.display.panel, "touch");
    case "ir_camera":
      return candidate.webcam.ir === true;
    case "dedicated_gpu":
      return item.dedicatedGpu === true;
    case "unified_fast_memory":
      return item.unifiedFast;
  }
}

/** Derived laptop features first, then the agent's own; a name in both counts once. */
export const featuresOf = (item: FeatureInput): string[] => [
  ...new Set([...DERIVED_FEATURES.filter((f) => has(item, f)), ...item.candidate.features]),
];

/** A feature is rare when at most a third of the eligible candidates have it. */
const RARE_SHARE_DENOMINATOR = 3;

/** Rare features per sku, over the eligible set. Covers derived and agent-listed features alike. */
export function rareFeatures(
  featured: readonly { sku: string; features: readonly string[] }[],
): Map<string, string[]> {
  const counts = new Map<string, number>();
  for (const entry of featured) {
    for (const feature of entry.features) counts.set(feature, (counts.get(feature) ?? 0) + 1);
  }
  const rare = new Set(
    [...counts].flatMap(([feature, count]) =>
      count * RARE_SHARE_DENOMINATOR <= featured.length ? [feature] : [],
    ),
  );
  return new Map(
    featured.map((entry) => [entry.sku, entry.features.filter((feature) => rare.has(feature))]),
  );
}
