import { GPU_PERCENTILE_ID, g3dScore, gpuValuePerEuro } from "@idealo-hw/hw-bench";

export const GPU_G3D = g3dScore.id;
export const GPU_PERCENTILE = GPU_PERCENTILE_ID;
export const GPU_PER_EURO = gpuValuePerEuro.id;

/** Order of the GPU rows and the fallback order for the headline number. */
export const GPU_VALUE_ORDER = [GPU_G3D, GPU_PERCENTILE, GPU_PER_EURO] as const;
