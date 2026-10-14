import type {
  FacetGroup,
  ModelScorer,
  NumericFacet,
  PriceRange,
  Requirements,
  RequirementsPlan,
} from "@idealo-hw/idealo-query";
import { NUMERIC_CONTROLS } from "../config";
import {
  type CpuBlockModel,
  cpuBlockModel,
  type GpuBlockModel,
  gpuBlockModel,
} from "./model-blocks";
import { type NumericSliderModel, numericSliderModel } from "./numeric-slider";
import { type PriceSliderModel, priceSliderModel } from "./price-slider";
import { type RamTypeModel, ramTypeModel } from "./ram-type";

export interface RequirementsViewInput {
  requirements: Requirements;
  plan: RequirementsPlan | null;
  scorer: ModelScorer;
  /** Which PassMark exports are imported; without one there is nothing to rank models by. */
  hasData: { cpu: boolean; gpu: boolean };
  priceBounds: { min: number; max: number } | null;
  /** Price shown when the requirements set none, e.g. the one in the page's url. */
  pagePrice: PriceRange | undefined;
}

export interface RequirementsViewModel {
  /** Null where the category has no CPU model group. */
  cpu: CpuBlockModel | null;
  gpu: GpuBlockModel | null;
  /** One entry per numeric facet the category lists; null where its options leave nothing to slide. */
  numeric: { facet: NumericFacet; slider: NumericSliderModel | null }[];
  ramType: RamTypeModel;
  price: PriceSliderModel | null;
}

/**
 * What the requirement controls show, derived from the catalog's facet groups, the requirements and
 * the plan; null when the category offers no requirement to set at all.
 */
export function buildRequirementsViewModel(
  groups: readonly FacetGroup[],
  input: RequirementsViewInput,
): RequirementsViewModel | null {
  const { requirements, plan, scorer, hasData, priceBounds, pagePrice } = input;
  const group = (facet: string): FacetGroup | undefined => groups.find((g) => g.facet === facet);
  const planOf = (facet: string) => plan?.facets.find((f) => f.facet === facet);
  const cpuGroup = group("cpu_model");
  const gpuGroup = group("gpu_model");
  const ramGroup = group("ram_type");

  const numeric = NUMERIC_CONTROLS.flatMap((control) => {
    const options = groups.flatMap((g) =>
      g.kind === "numeric" && g.facet === control.facet ? g.options : [],
    );
    return options.length === 0
      ? []
      : [
          {
            facet: control.facet,
            slider: numericSliderModel(
              control,
              options,
              requirements.numeric[control.facet],
              planOf(control.facet),
            ),
          },
        ];
  });
  const hasAnything =
    cpuGroup !== undefined ||
    gpuGroup !== undefined ||
    ramGroup !== undefined ||
    numeric.length > 0 ||
    priceBounds !== null;
  if (!hasAnything) return null;

  const modelInput = { requirements, scorer, planOf };
  return {
    cpu: cpuGroup === undefined ? null : cpuBlockModel(cpuGroup, hasData.cpu, modelInput),
    gpu: gpuGroup === undefined ? null : gpuBlockModel(gpuGroup, hasData.gpu, modelInput),
    numeric,
    ramType: ramTypeModel(
      ramGroup?.group.filters.map((option) => option.label) ?? [],
      requirements.labels.ram_type ?? [],
      planOf("ram_type"),
    ),
    price:
      priceBounds === null ? null : priceSliderModel(priceBounds, requirements.price ?? pagePrice),
  };
}
