import { BOTH, DESKTOP, EXCLUDED, UNCLASSIFIED } from "../membership";
import type { DeviceMembership } from "../model";
import { bySuffix, suffixOf } from "../suffix";

/** Intel i-series / Core Ultra / Core N / Core 3-9 suffixes. Closed lists, named by what they mean. */
const INTEL_MOBILE = new Set([
  "U",
  "H",
  "HX",
  "HK",
  "HQ",
  "P",
  "G",
  "Y",
  "M",
  "MQ",
  "QM",
  "UM",
  "XM",
  "V",
  "HS",
]);
const INTEL_DESKTOP = new Set([
  "",
  "F",
  "K",
  "KF",
  "KS",
  "KFC",
  "T",
  "S",
  "X",
  "XE",
  "B",
  "R",
  "C",
  "KC",
]);
/** IoT/embedded and "longevity" SKUs: E, TE, HE, UE, PE, GRE ("G7 + RE"), HL/UL, EQ. */
const INTEL_EMBEDDED = new Set([
  "E",
  "TE",
  "HE",
  "UE",
  "PE",
  "GRE",
  "HL",
  "UL",
  "EQ",
  "EF",
  "TEF",
  "RE",
  "HLE",
  "TLE",
  "EC",
  "QE",
  "L",
]);

export const intelBySuffix = (family: string, model: string): DeviceMembership => {
  if (/^N\d{2,3}$/.test(model)) return BOTH(`${family}/n-series`);
  // Core Ultra Series 3 (3xx) is Panther Lake: mobile parts carry no suffix letter (355, 365) or an X prefix (X7 358H).
  if (family.startsWith("intel-core-ultra") && /^3\d{2}$/.test(model)) {
    return BOTH(`${family}/series-3-mobile`);
  }
  return bySuffix(family, suffixOf(model), {
    mobile: INTEL_MOBILE,
    desktop: INTEL_DESKTOP,
    embedded: INTEL_EMBEDDED,
  });
};

/** Celeron/Pentium: N-series both, G/J-series desktop (E/TE embedded), numbered with U/Y or bare 4-digit mobile lines both. */
export function intelEntry(model: string): DeviceMembership {
  if (/^N\d{3,4}A?$/.test(model)) return BOTH("intel-entry/n-series");
  if (/^\d{4}$/.test(model)) return BOTH("intel-entry/numbered-mobile");
  const letter = /^([A-Z])\d{3,5}([A-Z]*)$/.exec(model);
  if (letter === null) return intelBySuffix("intel-entry", model);
  if (INTEL_EMBEDDED.has(letter[2] ?? "")) return EXCLUDED("intel-entry/embedded-suffix");
  return letter[1] === "G" || letter[1] === "J" ? DESKTOP("intel-entry/g-j-series") : UNCLASSIFIED;
}
