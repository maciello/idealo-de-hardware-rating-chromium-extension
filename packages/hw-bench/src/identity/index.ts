export {
  type CpuIdentity,
  type CpuModelParts,
  cpuModelParts,
  cpuNameKeys,
  extractCpuIdentity,
  normalizeCpuName,
  normalizeCpuNameWithoutVendor,
} from "./cpu";
export type { FormFactor } from "./form-factor";
export { cleanText, slugify, stripNameDecoration } from "./text";
