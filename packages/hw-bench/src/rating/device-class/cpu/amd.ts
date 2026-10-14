import { BOTH, DESKTOP, EXCLUDED, UNCLASSIFIED } from "../membership";
import type { DeviceMembership } from "../model";
import { bySuffix } from "../suffix";

/** Ryzen suffixes: mobile (U/H/HS/HX/C Chromebook) and desktop (none, X, XT, X3D, G, GE, GT, F). "E" is embedded. */
const RYZEN_MOBILE = new Set([
  "U",
  "H",
  "HS",
  "HX",
  "HX3D",
  "C",
  "CE",
  "UL",
  "HSL",
  "HL",
  "Z",
  "S",
]);
const RYZEN_DESKTOP = new Set([
  "",
  "X",
  "XT",
  "X3D",
  "G",
  "GE",
  "GT",
  "F",
  "T",
  "GX",
  "XE",
  "TX",
  "X3D2",
]);

export function ryzenClass(family: string, model: string): DeviceMembership {
  if (family.startsWith("Ryzen AI")) return BOTH("ryzen-ai/mobile-family");
  const match = /^(\d{3,5})([A-Z0-9]*)$/.exec(model.split(" ").at(-1) ?? "");
  if (match === null) return UNCLASSIFIED;
  if (match[1]?.length === 3) return BOTH("ryzen/three-digit-mobile");
  const suffix = match[2] ?? "";
  if (suffix === "E") return EXCLUDED("ryzen/embedded-suffix");
  return bySuffix("ryzen", suffix, { mobile: RYZEN_MOBILE, desktop: RYZEN_DESKTOP });
}

export function athlonClass(model: string): DeviceMembership {
  const suffix = /^\d{3,4}([A-Z]*)$/.exec(model)?.[1] ?? "?";
  if (["U", "C", "E", "UL"].includes(suffix)) return BOTH("athlon/mobile-suffix");
  if (["", "G", "GE", "X"].includes(suffix)) return DESKTOP("athlon/desktop-suffix");
  return UNCLASSIFIED;
}
