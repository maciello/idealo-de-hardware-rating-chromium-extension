import type { Bound, FacetOption, FacetPlan } from "@idealo-hw/idealo-query";
import { REQUIREMENTS_COPY } from "../../copy";
import { axisOf, type NumericControl, snapDown, snapUp } from "../../model";
import { statusLine } from "../status";
import { formatMeasure, labelledMarks } from "./measure";

const COPY = REQUIREMENTS_COPY;

interface SliderBase {
  id: string;
  label: string;
  valueText: string;
  status: string | null;
  min: number;
  max: number;
  marks: { value: number; label?: string }[];
  format: (value: number) => string;
}

interface RangeSliderModel extends SliderBase {
  kind: "range";
  value: [number, number];
  thumbFromLabel: string;
  thumbToLabel: string;
  toBound: (range: [number, number]) => Bound;
}

interface SingleSliderModel extends SliderBase {
  kind: "single";
  value: number;
  /** A minimum fills from the right. */
  inverted: boolean;
  thumbLabel: string;
  toBound: (next: number) => Bound;
}

export type NumericSliderModel = RangeSliderModel | SingleSliderModel;

/** What both kinds of slider are built from: the facet's label, its snap values and the stored bound. */
interface Axis {
  base: Omit<SliderBase, "label" | "valueText">;
  label: string;
  axis: readonly number[];
  first: number;
  last: number;
  bound: Bound | undefined;
}

/** A range slider: both ends move, an end at the axis edge means "no limit". */
function rangeSlider({ base, label, axis, first, last, bound }: Axis): RangeSliderModel {
  const low = bound?.min === undefined ? first : snapUp(axis, bound.min);
  const high = bound?.max === undefined ? last : snapDown(axis, bound.max);
  const { format } = base;
  const valueText =
    low === first && high === last
      ? COPY.any
      : low === first
        ? COPY.upTo(format(high))
        : high === last
          ? COPY.from(format(low))
          : COPY.between(format(low), format(high));
  return {
    ...base,
    kind: "range",
    label,
    valueText,
    value: [low, Math.max(low, high)],
    thumbFromLabel: COPY.rangeFrom(label),
    thumbToLabel: COPY.rangeTo(label),
    toBound: ([from, to]) => ({
      ...(from === first ? {} : { min: from }),
      ...(to === last ? {} : { max: to }),
    }),
  };
}

/** A one-ended slider: a minimum (lowest value = no limit) or a maximum (highest value = no limit). */
function singleSlider(
  { base, label, axis, first, last, bound }: Axis,
  isMin: boolean,
): SingleSliderModel {
  const unlimited = isMin ? first : last;
  const stored = isMin ? bound?.min : bound?.max;
  const value = stored === undefined ? unlimited : (isMin ? snapUp : snapDown)(axis, stored);
  return {
    ...base,
    kind: "single",
    label: COPY.bounded(label, isMin),
    valueText: value === unlimited ? COPY.any : base.format(value),
    value,
    inverted: isMin,
    thumbLabel: label,
    toBound: (next) => {
      if (next === unlimited) return {};
      return isMin ? { min: next } : { max: next };
    },
  };
}

/**
 * One slider per numeric facet, snapping to the values idealo lists. The end that means "no
 * restriction" (lowest for a minimum, highest for a maximum) clears the requirement. Null when the
 * options offer fewer than two values to choose from.
 */
export function numericSliderModel(
  control: NumericControl,
  options: readonly FacetOption[],
  bound: Bound | undefined,
  plan: FacetPlan | undefined,
): NumericSliderModel | null {
  const { facet, unit, direction } = control;
  const axis = axisOf(options, direction);
  const format = (value: number): string => formatMeasure(value, unit);
  const first = axis[0];
  const last = axis[axis.length - 1];
  if (first === undefined || last === undefined || axis.length < 2) return null;
  const ctx: Axis = {
    base: {
      id: facet,
      status: statusLine(plan),
      min: first,
      max: last,
      marks: labelledMarks(axis, format),
      format,
    },
    label: COPY.numericLabels[facet] ?? facet,
    axis,
    first,
    last,
    bound,
  };
  return direction === "range" ? rangeSlider(ctx) : singleSlider(ctx, direction === "min");
}
