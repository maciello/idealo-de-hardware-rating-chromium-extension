import { radeonIntegrated, radeonRx } from "./extractors/amd";
import { arc, hdGraphics, iris, irisXe, uhd } from "./extractors/intel";
import { geforce, quadroT, rtxA, rtxAda, rtxPro } from "./extractors/nvidia";
import type { GpuExtractor } from "./model";

/**
 * Every extractor in evaluation order. The order is behavior: on a tie between two matches at the same span,
 * the earlier extractor wins (see `extractGpuIdentity`).
 */
export const GPU_EXTRACTORS: readonly GpuExtractor[] = [
  geforce,
  radeonRx,
  radeonIntegrated,
  arc,
  irisXe,
  hdGraphics,
  iris,
  uhd,
  rtxAda,
  rtxA,
  rtxPro,
  quadroT,
];
