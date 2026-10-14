import { BOTH, DESKTOP, EXCLUDED, UNCLASSIFIED } from "./membership";
import type { DeviceMembership } from "./model";

/** The model's own suffix letters: "1235U" -> "U", "1115G4" -> "G", "12900HX" -> "HX", "13400" -> "". */
export const suffixOf = (model: string): string =>
  /^[A-Z]?\d{3,5}([A-Z]*)\d?$/.exec(model.replace(/ PLUS$/, ""))?.[1] ?? "?";

export interface SuffixTables {
  readonly mobile: ReadonlySet<string>;
  readonly desktop: ReadonlySet<string>;
  readonly embedded?: ReadonlySet<string>;
}

/** Mobile x86 lines are in both sets (mini PCs); desktop lines in DesktopCpu only; embedded SKUs are out of domain. */
export const bySuffix = (
  family: string,
  suffix: string,
  tables: SuffixTables,
): DeviceMembership => {
  if (tables.embedded?.has(suffix)) return EXCLUDED(`${family}/embedded-suffix`);
  if (tables.mobile.has(suffix)) return BOTH(`${family}/mobile-suffix`);
  if (tables.desktop.has(suffix)) return DESKTOP(`${family}/desktop-suffix`);
  return UNCLASSIFIED;
};
