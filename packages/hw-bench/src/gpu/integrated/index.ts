import { type CpuIdentity, extractCpuIdentity } from "../../identity";
import { findIgpuRule } from "./match";
import type { IgpuRule } from "./model";
import { IGPU_RULES } from "./rules";

export { isIntegratedGpu } from "./classify";
export type { IgpuMatch, IgpuRule, IgpuTarget } from "./model";
export { createGpuNameLookup } from "./records";
export { IGPU_RULES };

/**
 * The rule that names the integrated graphics of a CPU, from the CPU text of a tile ("Intel Core i7-13700H") or a
 * PassMark CPU name. Never reads GPU text. Null when no rule knows the CPU; a rule with `igpu.kind === "none"`
 * says the CPU has no integrated graphics.
 */
export function integratedGpuOf(cpuText: string, identity?: CpuIdentity | null): IgpuRule | null {
  return findIgpuRule(
    IGPU_RULES,
    identity === undefined ? extractCpuIdentity(cpuText) : identity,
    cpuText,
  );
}
