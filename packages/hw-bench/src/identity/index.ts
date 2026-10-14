export {
  type CpuIdentity,
  type CpuModelParts,
  type CpuNameKey,
  cpuModelParts,
  cpuNameKeys,
  extractCpuIdentity,
  normalizeCpuName,
  normalizeCpuNameWithoutVendor,
} from "./cpu";
export type { FormFactor } from "./form-factor";
export { cleanText, type StrippedName, slugify, stripNameDecoration } from "./text";
