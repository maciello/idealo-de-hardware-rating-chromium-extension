import type { FacetOption, FacetPlan } from "@idealo-hw/idealo-query";
import { RangeSlider, Slider } from "@mantine/core";
import { useMemo } from "react";
import {
  axisOf,
  formatMeasure,
  labelledMarks,
  type NumericControl,
  snapDown,
  snapUp,
} from "./controls";
import { SliderField } from "./SliderField";
import type { Bound } from "./state";
import { statusLine } from "./status";

export interface NumericSliderProps {
  control: NumericControl;
  /** Options of every catalog group that carries this facet. */
  options: readonly FacetOption[];
  bound: Bound | undefined;
  plan: FacetPlan | undefined;
  onChange: (bound: Bound) => void;
}

/**
 * One slider per numeric facet, snapping to the values idealo lists. The end that means "no
 * restriction" (lowest for a minimum, highest for a maximum) clears the requirement.
 */
export function NumericSlider({ control, options, bound, plan, onChange }: NumericSliderProps) {
  const { facet, label, unit, direction } = control;
  const axis = useMemo(() => axisOf(options, direction), [options, direction]);
  const format = (value: number): string => formatMeasure(value, unit);
  const marks = useMemo(
    () => labelledMarks(axis, (value) => formatMeasure(value, unit)),
    [axis, unit],
  );
  const first = axis[0];
  const last = axis[axis.length - 1];
  if (first === undefined || last === undefined || axis.length < 2) return null;
  const common = { min: first, max: last, marks, restrictToMarks: true, label: format } as const;
  const status = statusLine(plan);

  if (direction === "range") {
    const low = bound?.min === undefined ? first : snapUp(axis, bound.min);
    const high = bound?.max === undefined ? last : snapDown(axis, bound.max);
    const text =
      low === first && high === last
        ? "any"
        : low === first
          ? `≤ ${format(high)}`
          : high === last
            ? `≥ ${format(low)}`
            : `${format(low)} – ${format(high)}`;
    return (
      <SliderField id={facet} label={label} value={text} status={status} withMarkLabels>
        <RangeSlider
          {...common}
          size="xs"
          minRange={0}
          value={[low, Math.max(low, high)]}
          thumbFromLabel={`${label} from`}
          thumbToLabel={`${label} to`}
          onChange={([from, to]) =>
            onChange({
              ...(from === first ? {} : { min: from }),
              ...(to === last ? {} : { max: to }),
            })
          }
        />
      </SliderField>
    );
  }

  const isMin = direction === "min";
  const value = isMin
    ? bound?.min === undefined
      ? first
      : snapUp(axis, bound.min)
    : bound?.max === undefined
      ? last
      : snapDown(axis, bound.max);
  const unset = value === (isMin ? first : last);
  return (
    <SliderField
      id={facet}
      label={`${label} ${isMin ? "≥" : "≤"}`}
      value={unset ? "any" : format(value)}
      status={status}
      withMarkLabels
    >
      <Slider
        {...common}
        size="xs"
        inverted={isMin}
        value={value}
        thumbLabel={label}
        onChange={(next) => {
          if (next === (isMin ? first : last)) onChange({});
          else onChange(isMin ? { min: next } : { max: next });
        }}
      />
    </SliderField>
  );
}
