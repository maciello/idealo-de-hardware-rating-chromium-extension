import type { PriceRange, Requirements } from "@idealo-hw/idealo-query";
import {
  type Combine,
  METRIC,
  setCombine,
  setLabels,
  setMinimum,
  setNumeric,
  setPriceRange,
} from "../model";
import type { RequirementEdits } from "../view-model";

export function createRequirementEdits(
  requirements: Requirements,
  onChange: (next: Requirements) => void,
  onPriceChange: (price: PriceRange) => void,
): RequirementEdits {
  const cpuCombine: Combine = requirements.models.cpu_model?.combine ?? "all";
  return {
    setCpuMinimum: (metric, value) =>
      onChange(setMinimum(requirements, "cpu_model", metric, value, cpuCombine)),
    setCpuCombine: (combine) => onChange(setCombine(requirements, "cpu_model", combine)),
    setGpuMinimum: (value) =>
      onChange(setMinimum(requirements, "gpu_model", METRIC.g3d, value, "all")),
    setNumeric: (facet, bound) => onChange(setNumeric(requirements, facet, bound)),
    setRamTypes: (labels) => onChange(setLabels(requirements, "ram_type", labels)),
    setPrice: (price) => {
      onChange(setPriceRange(requirements, price));
      onPriceChange(price);
    },
  };
}
