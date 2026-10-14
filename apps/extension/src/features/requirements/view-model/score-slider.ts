import type { Metric } from "@idealo-hw/idealo-query";
import { formatInteger } from "../../../ui/format";
import { REQUIREMENTS_COPY } from "../copy";
import type { ScoreSpan } from "../model";

export interface ScoreSliderInput {
  id: string;
  /** The benchmark metric the minimum is set for. */
  metric: Metric;
  label: string;
  /** Lowest and highest score among the CPUs/GPUs the category lists. */
  span: ScoreSpan;
  step: number;
  /** Undefined = no minimum. */
  value: number | undefined;
  status: string | null | undefined;
}

export interface ScoreSliderModel {
  id: string;
  metric: Metric;
  /** Field label, "<label> ≥". */
  fieldLabel: string;
  thumbLabel: string;
  min: number;
  max: number;
  step: number;
  current: number;
  valueText: string;
  status: string | null | undefined;
  format: (value: number) => string;
  /** The minimum a slider position stands for; its lowest end means "any". */
  toMinimum: (next: number) => number | undefined;
}

/** A benchmark-minimum slider over the scores of the listed models; null when the span is flat. */
export function scoreSliderModel(input: ScoreSliderInput): ScoreSliderModel | null {
  const { id, metric, label, span, step, value, status } = input;
  const min = Math.floor(span.min / step) * step;
  const max = Math.ceil(span.max / step) * step;
  if (min >= max) return null;
  const current = value === undefined ? min : Math.min(max, Math.max(min, value));
  return {
    id,
    metric,
    fieldLabel: REQUIREMENTS_COPY.atLeast(label),
    thumbLabel: label,
    min,
    max,
    step,
    current,
    valueText: current === min ? REQUIREMENTS_COPY.any : formatInteger(current),
    status,
    format: formatInteger,
    toMinimum: (next) => (next <= min ? undefined : next),
  };
}
