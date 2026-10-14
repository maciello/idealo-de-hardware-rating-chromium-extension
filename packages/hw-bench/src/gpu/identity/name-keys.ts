import { normalizeGpuName } from "./normalize";

/**
 * Looser key for names that `normalizeGpuName` could not match; only consulted after it found nothing.
 * Two naming conventions: a letter group written apart from its number is the same name ("WX 3100" = "WX3100"),
 * and PassMark's trailing noun "GPU" ("Qualcomm Adreno 618 GPU") is not part of the model. A name that is only
 * a family word plus "GPU" ("Qualcomm Adreno GPU") has no model number and keeps its word.
 */
export function looseGpuNameKey(text: string): string {
  const joined = normalizeGpuName(text).replace(/(?<=[a-z])-(?=\d)/g, "");
  const withoutNoun = joined.replace(/-gpu$/, "");
  return /\d/.test(withoutNoun) ? withoutNoun : joined;
}

/**
 * Key of the same card without the mobile "M" that idealo appends to Quadro models ("Quadro M2200M") and that PassMark
 * sometimes omits ("Quadro M2200", filed under Mobile); null for any other name.
 */
export function quadroWithoutMobileSuffix(text: string): string | null {
  const m = /^(quadro-[a-z]\d{3,4})m$/.exec(normalizeGpuName(text));
  return m?.[1] ?? null;
}

/**
 * PassMark names one record after two models of the same silicon: "Radeon RX 470/570". Returns the name once per
 * listed model ("Radeon RX 470", "Radeon RX 570"); any other name comes back unchanged.
 */
export function splitCombinedModelName(name: string): readonly string[] {
  const m = /(?<![a-z0-9])(\d{3,4})\/(\d{3,4})(?![a-z0-9/])/i.exec(name);
  if (m === null) return [name];
  return [m[1], m[2]].map((model) => name.replace(m[0], model ?? ""));
}
