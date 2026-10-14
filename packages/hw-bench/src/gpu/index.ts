export { extractGpuIdentity, type GpuIdentity, normalizeGpuName } from "./identity";
export {
  createGpuNameLookup,
  IGPU_RULES,
  type IgpuMatch,
  type IgpuRule,
  type IgpuTarget,
  integratedGpuOf,
  isIntegratedGpu,
} from "./integrated";
export { createGpuMatcher, type GpuMatcher, type GpuMatchOptions } from "./matcher";
export { type GraphicsMemory, graphicsMemoryOf } from "./vram";
