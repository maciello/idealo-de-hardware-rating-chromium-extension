import type { GpuIdentity } from "../../../gpu";
import { cleanText } from "../../../identity";
import { BOTH, DESKTOP, EXCLUDED, LAPTOP, UNCLASSIFIED } from "../membership";
import type { DeviceMembership } from "../model";

/** Mobile-only GeForce models: PassMark names them without "Laptop GPU" but no desktop card exists. */
const NVIDIA_MOBILE_ONLY = new Set(["2050", "3050 Ti", "1650 Ti"]);
/** Intel desktop iGPUs by model; unnumbered "UHD Graphics" is the mobile branding, other numbers exist in both. */
const INTEL_DESKTOP_IGPU = new Set(["710", "730", "750", "770"]);
/** Arc discrete cards by model: A-series mobile ends in M, desktop cards are this closed list; B370/B390 are Panther Lake iGPUs. */
const ARC_DESKTOP_DISCRETE = new Set([
  "A310",
  "A380",
  "A580",
  "A750",
  "A770",
  "B570",
  "B580",
  "A40",
  "A50",
  "A60",
  "B50",
  "B60",
  "B70",
]);
const ARC_IGPU_MODELS = new Set(["B370", "B390"]);
const EMBEDDED_QUALIFIER = /\b(?:embedded|server edition|server)\b/;

export function gpuByIdentity(identity: GpuIdentity): DeviceMembership {
  const { family, model, variant, residual } = identity;
  if (EMBEDDED_QUALIFIER.test(cleanText(residual))) return EXCLUDED("embedded-or-server-edition");
  const first = model.split(" ")[0] ?? "";
  if (variant === "laptop") return LAPTOP("name-says-laptop-or-max-q");
  switch (family) {
    case "GeForce MX":
      return LAPTOP("geforce-mx");
    case "GeForce RTX":
    case "GeForce GTX":
    case "GeForce GT":
      return NVIDIA_MOBILE_ONLY.has(model)
        ? LAPTOP("nvidia-mobile-only")
        : DESKTOP("geforce-discrete");
    case "Radeon RX":
      return /\d[MS]$/.test(first) ? LAPTOP("radeon-rx-m-s-suffix") : DESKTOP("radeon-rx-desktop");
    case "Radeon":
      return /^\d{3,4}M$|^\d{4}S$|^\d{4}C?E$/.test(first)
        ? BOTH("radeon-igpu-mobile-line")
        : UNCLASSIFIED;
    case "Arc":
    case "Arc Pro":
      if (/^A\d{2,3}M$/.test(first)) return LAPTOP("arc-mobile-discrete");
      if (ARC_DESKTOP_DISCRETE.has(first)) return DESKTOP("arc-desktop-discrete");
      return /^1[34]0[VT]$|^$/.test(first) || ARC_IGPU_MODELS.has(first)
        ? BOTH("arc-igpu")
        : UNCLASSIFIED;
    case "Iris Xe":
      return model === "" ? BOTH("iris-xe") : LAPTOP("iris-xe-max");
    case "Iris":
    case "Iris Plus":
    case "Iris Pro":
      return /^\d/.test(first) ? BOTH("iris-mobile-line") : UNCLASSIFIED;
    case "UHD Graphics":
    case "HD Graphics":
      if (INTEL_DESKTOP_IGPU.has(first)) return DESKTOP("intel-desktop-igpu");
      // Every other Intel iGPU generation ships in notebooks and in desktops/mini PCs; P-series are Xeon parts.
      return first === "" || /^\d/.test(first) ? BOTH("intel-igpu-both-classes") : UNCLASSIFIED;
    case "T":
      return BOTH("nvidia-t-series-workstation");
    case "RTX Ada":
    case "RTX":
    case "RTX PRO":
      return DESKTOP("nvidia-workstation");
    default:
      return UNCLASSIFIED;
  }
}
