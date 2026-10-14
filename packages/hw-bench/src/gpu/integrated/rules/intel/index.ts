import type { IgpuRule } from "../../model";
import { INTEL_CORE_I_DESKTOP_NEW_RULES } from "./core-i-desktop-new";
import { INTEL_CORE_I_DESKTOP_OLD_RULES } from "./core-i-desktop-old";
import { INTEL_CORE_I_GEN6_9_RULES } from "./core-i-gen6-9";
import { INTEL_CORE_I_GEN10_RULES } from "./core-i-gen10";
import { INTEL_CORE_I_GEN12_14_TO_CORE_I_GEN11_RULES } from "./core-i-gen12-14-to-core-i-gen11";
import { INTEL_CORE_ULTRA_S2_RULES } from "./core-ultra-s2";
import { INTEL_CORE_ULTRA_S3_TO_CORE_NUMBERED_RULES } from "./core-ultra-s3-to-core-numbered";
import { INTEL_N_SERIES_RULES } from "./n-series";
import { INTEL_NO_GRAPHICS_TO_CORE_ULTRA_S1_RULES } from "./no-graphics-to-core-ultra-s1";
import { INTEL_XEON_CORE2_RULES } from "./xeon-core2";

/** In evaluation order. */
export const INTEL_RULES: readonly IgpuRule[] = [
  ...INTEL_NO_GRAPHICS_TO_CORE_ULTRA_S1_RULES,
  ...INTEL_CORE_ULTRA_S2_RULES,
  ...INTEL_CORE_ULTRA_S3_TO_CORE_NUMBERED_RULES,
  ...INTEL_N_SERIES_RULES,
  ...INTEL_CORE_I_DESKTOP_NEW_RULES,
  ...INTEL_CORE_I_DESKTOP_OLD_RULES,
  ...INTEL_CORE_I_GEN12_14_TO_CORE_I_GEN11_RULES,
  ...INTEL_CORE_I_GEN10_RULES,
  ...INTEL_CORE_I_GEN6_9_RULES,
  ...INTEL_XEON_CORE2_RULES,
];
