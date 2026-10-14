import type { IgpuRule } from "../model";
import { AMD_RULES } from "./amd";
import { INTEL_RULES } from "./intel";
import { OTHER_RULES } from "./other";

/** Vendors never share a match key, so only the order inside a vendor matters. */
export const IGPU_RULES: readonly IgpuRule[] = [...AMD_RULES, ...INTEL_RULES, ...OTHER_RULES];
