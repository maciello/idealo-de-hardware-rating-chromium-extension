import { Slider } from "@mantine/core";
import type { ScoreSliderModel } from "../../view-model";
import { SliderField } from "./SliderField";

export interface ScoreSliderProps {
  model: ScoreSliderModel;
  onChange: (value: number | undefined) => void;
}

/** A benchmark-minimum slider over the scores of the listed models; its lowest end means "any". */
export function ScoreSlider({ model, onChange }: ScoreSliderProps) {
  return (
    <SliderField
      id={model.id}
      label={model.fieldLabel}
      value={model.valueText}
      status={model.status}
    >
      <Slider
        size="xs"
        inverted
        min={model.min}
        max={model.max}
        step={model.step}
        value={model.current}
        label={model.format}
        thumbLabel={model.thumbLabel}
        onChange={(next) => onChange(model.toMinimum(next))}
      />
    </SliderField>
  );
}
