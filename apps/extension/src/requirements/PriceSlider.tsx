import type { PriceRange } from "@idealo-hw/idealo-query";
import { RangeSlider } from "@mantine/core";
import { formatInteger } from "../ratings/present";
import { SliderField } from "./SliderField";

export interface PriceSliderProps {
  /** Cheapest and dearest price of the page's result set. */
  bounds: { min: number; max: number };
  price: PriceRange | undefined;
  onChange: (price: PriceRange) => void;
}

const euro = (value: number): string => `${formatInteger(value)} €`;

/** Price range over the page's own bounds; an end at the bound means "no limit". */
export function PriceSlider({ bounds, price, onChange }: PriceSliderProps) {
  const step = bounds.max - bounds.min > 2000 ? 50 : 10;
  const min = Math.floor(bounds.min / step) * step;
  const max = Math.ceil(bounds.max / step) * step;
  if (min >= max) return null;
  const clamp = (value: number): number => Math.min(max, Math.max(min, value));
  const from = clamp(price?.min ?? min);
  const to = clamp(price?.max ?? max);
  const text =
    from === min && to === max
      ? "any"
      : from === min
        ? `up to ${euro(to)}`
        : to === max
          ? `from ${euro(from)}`
          : `${euro(from)} – ${euro(to)}`;
  return (
    <SliderField id="price" label="Price" value={text}>
      <RangeSlider
        size="xs"
        min={min}
        max={max}
        step={step}
        minRange={step}
        value={[from, to]}
        label={euro}
        thumbFromLabel="Price from"
        thumbToLabel="Price to"
        onChange={([a, b]) =>
          onChange({ ...(a <= min ? {} : { min: a }), ...(b >= max ? {} : { max: b }) })
        }
      />
    </SliderField>
  );
}
