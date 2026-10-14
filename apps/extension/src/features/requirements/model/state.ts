import {
  type LabelFacet,
  type ModelFacet,
  type NumericFacet,
  type PriceRange,
  type Requirements,
  RequirementsSchema,
} from "@idealo-hw/idealo-query";
import type { Metric } from "./scorer";

export type Combine = "all" | "any";
export type Bound = { min?: number | undefined; max?: number | undefined };

export const emptyRequirements = (): Requirements => RequirementsSchema.parse({});

/** Without any requirement the panel behaves like the plain filter builder. */
export const isEmpty = (requirements: Requirements): boolean =>
  Object.keys(requirements.numeric).length === 0 &&
  Object.keys(requirements.models).length === 0 &&
  Object.keys(requirements.labels).length === 0 &&
  requirements.price === undefined;

const without = <T extends object>(record: T, key: keyof T): T => {
  const { [key]: _removed, ...rest } = record;
  return rest as T;
};

/** An empty bound removes the requirement. */
export function setNumeric(
  requirements: Requirements,
  facet: NumericFacet,
  bound: Bound,
): Requirements {
  const kept = {
    ...(bound.min === undefined ? {} : { min: bound.min }),
    ...(bound.max === undefined ? {} : { max: bound.max }),
  };
  return {
    ...requirements,
    numeric:
      Object.keys(kept).length === 0
        ? without(requirements.numeric, facet)
        : { ...requirements.numeric, [facet]: kept },
  };
}

/** Sets or clears one benchmark minimum of a model facet; no minimum left removes the facet. */
export function setMinimum(
  requirements: Requirements,
  facet: ModelFacet,
  metric: Metric,
  value: number | undefined,
  combine: Combine,
): Requirements {
  const current = requirements.models[facet]?.minimums ?? {};
  const minimums = value === undefined ? without(current, metric) : { ...current, [metric]: value };
  return {
    ...requirements,
    models:
      Object.keys(minimums).length === 0
        ? without(requirements.models, facet)
        : { ...requirements.models, [facet]: { minimums, combine } },
  };
}

/** Changes how the minimums of a model facet combine; only meaningful while one is set. */
export function setCombine(
  requirements: Requirements,
  facet: ModelFacet,
  combine: Combine,
): Requirements {
  const current = requirements.models[facet];
  return current === undefined
    ? requirements
    : { ...requirements, models: { ...requirements.models, [facet]: { ...current, combine } } };
}

export function setLabels(
  requirements: Requirements,
  facet: LabelFacet,
  labels: readonly string[],
): Requirements {
  return {
    ...requirements,
    labels:
      labels.length === 0
        ? without(requirements.labels, facet)
        : { ...requirements.labels, [facet]: [...labels] },
  };
}

export function setPriceRange(requirements: Requirements, price: PriceRange): Requirements {
  const { price: _previous, ...rest } = requirements;
  return price.min === undefined && price.max === undefined ? rest : { ...rest, price };
}
