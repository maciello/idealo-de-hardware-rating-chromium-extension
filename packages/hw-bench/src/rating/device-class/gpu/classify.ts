import { extractGpuIdentity } from "../../../gpu";
import { classifyCpu } from "../cpu";
import { byRules, EXCLUDED, UNCLASSIFIED } from "../membership";
import type { DeviceMembership } from "../model";
import { plainName } from "../plain-name";
import { gpuByIdentity } from "./by-identity";
import { GPU_EXCLUDE_RULES } from "./exclude-rules";
import { GPU_PRO_RULES } from "./pro-rules";

/**
 * Classifies a PassMark GPU name. Exclusion rules run first; an iGPU named after a CPU follows that CPU's membership.
 * iGPU membership follows the host CPU family's class.
 *
 *   LaptopGpu  = mobile discrete consumer {name says Laptop GPU/Max-Q, RX nnnnM/S, Arc AnnnM, GeForce MX, mobile-only
 *                GeForce} union mobile workstation {RTX Pro/A/Ada Laptop GPU, Quadro ...M, Radeon Pro nnnnM}
 *                union iGPUs of LaptopCpu families {Iris Xe, Arc 1x0V/1x0T, Radeon nnnM/nnnnS, unnumbered UHD, Adreno X,
 *                Adreno 6xx and Immortalis of Windows/Chromebook SoCs}
 *   DesktopGpu = desktop discrete consumer {GeForce, Radeon RX without M/S, Arc A/B} union workstation and AI cards
 *                {RTX A/Ada/PRO, Quadro, Radeon PRO W/AI Pro, GB10} union iGPUs of DesktopCpu families {UHD 710/730/750/770,
 *                Iris Xe, Arc, Radeon nnnM (mini PCs)}
 *   ExcludedGpu = virtual/remote adapters (GRID, vGPU profiles "-1B"/"-16Q", MS Idd, DisplayLink), datacenter accelerators
 *                (A100, L4, T4...), embedded and server editions, server iGPUs, phone GPUs (Adreno, Mali, PowerVR, Glenfly),
 *                mining cards (CMP).
 */
export function classifyGpu(name: string): DeviceMembership {
  const text = plainName(name);
  const excludedFirst = byRules(GPU_EXCLUDE_RULES, text);
  if (excludedFirst !== null) return excludedFirst;
  if (/^(?:amd )?(?:radeon|ryzen)\b|^intel (?:graphics|uhd|hd|iris|arc)\b/.test(text)) {
    const cpu = classifyCpu(text);
    if (cpu.status === "member") return { ...cpu, rule: `igpu-of-${cpu.rule}` };
    if (cpu.status === "excluded") return EXCLUDED(`igpu-of-${cpu.rule}`);
  }
  const proRule = byRules(GPU_PRO_RULES, text);
  if (proRule !== null) return proRule;
  const identity = extractGpuIdentity(text);
  return identity === null ? UNCLASSIFIED : gpuByIdentity(identity);
}
