import { type CpuIdentity, extractCpuIdentity } from "../../../identity";
import { BOTH, byRules, DESKTOP, LAPTOP, UNCLASSIFIED } from "../membership";
import type { DeviceMembership } from "../model";
import { plainName } from "../plain-name";
import { athlonClass, ryzenClass } from "./amd";
import { intelBySuffix, intelEntry } from "./intel";
import { CPU_NAME_RULES } from "./name-rules";

/**
 * Classifies a PassMark CPU name; `identity` may be passed when the caller already parsed it.
 *
 *   Client       = {r in U : family(r) in {Intel Core i3/i5/i7/i9, Core Ultra, Core 3/5/7/9, Core N, Celeron, Pentium,
 *                  Intel N/U-series; AMD Ryzen, Ryzen AI, Athlon; Apple M; Snapdragon X/7c/8c/8cx; MediaTek Kompanio;
 *                  Apple A18 Pro}}
 *   LaptopCpu    = {r in Client : suffix(r) in MOBILE_SUFFIX(family) or family in {Apple M except Ultra, Apple A18 Pro,
 *                  Snapdragon, Kompanio, Ryzen AI, N-series, three-digit Ryzen}}
 *   DesktopCpu   = {r in Client : suffix(r) in DESKTOP_SUFFIX(family)} union {r in LaptopCpu : x86 mobile line or Apple M
 *                  or N-series} union HEDT/workstation {Threadripper, Xeon W, Apple M Ultra} union {Atom x, NVIDIA GB10}
 *                  (Snapdragon, Kompanio and Apple A18 Pro are laptop-only)
 *   ExcludedCpu  = {r in U : name in OutOfDomain}: virtual machines, bare core-IP and AArch64/Android names, dev boards,
 *                  phone SoCs (Snapdragon 8-series, Dimensity, Helio, Exynos, Tensor, Kirin, Apple A except A18 Pro),
 *                  server (Xeon except W, EPYC, Opteron, Ampere, Atom C), embedded (Ryzen Embedded, AMD GX/RX-, Intel
 *                  E/TE/HE/UE/PE/L-suffix IoT SKUs), CPUs not sold in DE retail (Hygon, Zhaoxin, Phytium, Kunpeng, CIX).
 */
export function classifyCpu(name: string, identity?: CpuIdentity | null): DeviceMembership {
  const text = plainName(name);
  const named = byRules(CPU_NAME_RULES, text);
  if (named !== null) return named;
  const parsed = identity === undefined ? extractCpuIdentity(text) : identity;
  if (parsed !== null) {
    const { vendor, family, model } = parsed;
    if (vendor === "Intel") {
      if (/^Core i\d$|^Core Ultra X?\d$|^Core \d$|^Core$/.test(family)) {
        return intelBySuffix(`intel-${family.toLowerCase().replace(/\s+/g, "-")}`, model);
      }
      if (family === "") return /^N\d/.test(model) ? BOTH("intel-n/n-series") : UNCLASSIFIED;
      if (family.startsWith("Celeron") || family.startsWith("Pentium")) return intelEntry(model);
    }
    if (vendor === "AMD") {
      if (family === "Ryzen Threadripper") return DESKTOP("threadripper/hedt");
      if (family.startsWith("Ryzen")) return ryzenClass(family, model);
      if (family.startsWith("Athlon")) return athlonClass(model);
    }
    if (vendor === "Apple")
      return /ULTRA$/.test(model.toUpperCase())
        ? DESKTOP("apple-m/ultra")
        : BOTH("apple-m/base-pro-max");
    if (vendor === "Qualcomm") return LAPTOP("snapdragon-x");
    if (vendor === "MediaTek") return LAPTOP("kompanio-chromebook");
  }
  return UNCLASSIFIED;
}
