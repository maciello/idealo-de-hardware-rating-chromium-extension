import type { IgpuRule } from "../../model";
import { OTHER_QUALCOMM_TO_APPLE_MEDIATEK_RULES } from "./qualcomm-to-apple-mediatek";

/** In evaluation order. */
export const OTHER_RULES: readonly IgpuRule[] = [...OTHER_QUALCOMM_TO_APPLE_MEDIATEK_RULES];
