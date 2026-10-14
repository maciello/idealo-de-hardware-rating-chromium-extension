import type { PriceRange } from "@idealo-hw/idealo-query";
import { RangeSlider } from "@mantine/core";
import { REQUIREMENTS_COPY } from "../../copy";
import type { PriceSliderModel } from "../../view-model";
import { SliderField } from "./SliderField";

export interface PriceSliderProps {
  model: PriceSliderModel;
  onChange: (price: PriceRange) => void;
}

/** Price range over the page's own bounds; an end at the bound means "no limit". */
export function PriceSlider({ model, onChange }: PriceSliderProps) {
  const { price } = REQUIREMENTS_COPY;
  return (
    <SliderField id="price" label={price.label} value={model.valueText}>
      <RangeSlider
        size="xs"
        min={model.min}
        max={model.max}
        step={model.step}
        minRange={model.step}
        value={[model.from, model.to]}
        label={model.format}
        thumbFromLabel={price.thumbFrom}
        thumbToLabel={price.thumbTo}
        onChange={([a, b]) => onChange(model.toPrice(a, b))}
      />
    </SliderField>
  );
}
