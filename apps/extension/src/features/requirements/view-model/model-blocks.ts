import {
  type Combine,
  type FacetGroup,
  type FacetPlan,
  METRIC,
  type Metric,
  type ModelFacet,
  type ModelScorer,
  type Requirements,
} from "@idealo-hw/idealo-query";
import { MIN_STEPS } from "../config";
import { REQUIREMENTS_COPY } from "../copy";
import { scoreSpan } from "../model";
import { type ScoreSliderModel, scoreSliderModel } from "./score-slider";
import { statusLine } from "./status";

const COPY = REQUIREMENTS_COPY;

export type CpuBlockModel =
  | { state: "no-data" }
  | {
      state: "ready";
      mark: ScoreSliderModel | null;
      single: ScoreSliderModel | null;
      combine: Combine;
      /** Combining only means something while a minimum is set. */
      combineDisabled: boolean;
      status: string | null;
    };

export type GpuBlockModel = { state: "no-data" } | { state: "ready"; g3d: ScoreSliderModel | null };

interface ModelInput {
  requirements: Requirements;
  scorer: ModelScorer;
  planOf: (facet: string) => FacetPlan | undefined;
}

const spanOf = (
  target: FacetGroup | undefined,
  facet: ModelFacet,
  metric: Metric,
  scorer: ModelScorer,
) => (target === undefined ? null : scoreSpan(target.group, facet, metric, scorer));

/** CPU minimums, or the import hint while there is no CPU data to rank by. */
export function cpuBlockModel(
  group: FacetGroup,
  hasData: boolean,
  { requirements, scorer, planOf }: ModelInput,
): CpuBlockModel {
  const markSpan = spanOf(group, "cpu_model", METRIC.cpuMark, scorer);
  if (!hasData || markSpan === null) return { state: "no-data" };
  const singleSpan = spanOf(group, "cpu_model", METRIC.cpuSingle, scorer);
  const cpu = requirements.models.cpu_model;
  const slider = (id: string, label: string, span: typeof markSpan, metric: Metric) =>
    scoreSliderModel({
      id,
      metric,
      label,
      span,
      step: MIN_STEPS[metric],
      value: cpu?.minimums[metric],
      status: undefined,
    });
  return {
    state: "ready",
    mark: slider("cpu_mark", COPY.cpuMarkLabel, markSpan, METRIC.cpuMark),
    single:
      singleSpan === null
        ? null
        : slider("cpu_single", COPY.cpuSingleLabel, singleSpan, METRIC.cpuSingle),
    combine: cpu?.combine ?? "all",
    combineDisabled: cpu === undefined,
    status: statusLine(planOf("cpu_model")),
  };
}

/** The G3D minimum, or the import hint while there is no GPU data to rank by. */
export function gpuBlockModel(
  group: FacetGroup,
  hasData: boolean,
  { requirements, scorer, planOf }: ModelInput,
): GpuBlockModel {
  const span = spanOf(group, "gpu_model", METRIC.g3d, scorer);
  if (!hasData || span === null) return { state: "no-data" };
  return {
    state: "ready",
    g3d: scoreSliderModel({
      id: "g3d",
      metric: METRIC.g3d,
      label: COPY.g3dLabel,
      span,
      step: MIN_STEPS[METRIC.g3d],
      value: requirements.models.gpu_model?.minimums[METRIC.g3d],
      status: statusLine(planOf("gpu_model")),
    }),
  };
}
