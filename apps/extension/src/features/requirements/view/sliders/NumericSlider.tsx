import type { Bound } from "@idealo-hw/idealo-query";
import { RangeSlider, Slider } from "@mantine/core";
import type { NumericSliderModel } from "../../view-model";
import { SliderField } from "./SliderField";

export interface NumericSliderProps {
  model: NumericSliderModel;
  onChange: (bound: Bound) => void;
}

/** One slider per numeric facet, snapping to the values idealo lists. */
export function NumericSlider({ model, onChange }: NumericSliderProps) {
  const common = {
    min: model.min,
    max: model.max,
    marks: model.marks,
    restrictToMarks: true,
    label: model.format,
    size: "xs",
  } as const;
  return (
    <SliderField
      id={model.id}
      label={model.label}
      value={model.valueText}
      status={model.status}
      withMarkLabels
    >
      {model.kind === "range" ? (
        <RangeSlider
          {...common}
          minRange={0}
          value={model.value}
          thumbFromLabel={model.thumbFromLabel}
          thumbToLabel={model.thumbToLabel}
          onChange={(range) => onChange(model.toBound(range))}
        />
      ) : (
        <Slider
          {...common}
          inverted={model.inverted}
          value={model.value}
          thumbLabel={model.thumbLabel}
          onChange={(next) => onChange(model.toBound(next))}
        />
      )}
    </SliderField>
  );
}
