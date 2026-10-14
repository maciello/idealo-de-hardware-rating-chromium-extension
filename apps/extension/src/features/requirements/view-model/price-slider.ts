import type { PriceRange } from "@idealo-hw/idealo-query";
import { formatInteger } from "../../../ui/format";
import { PRICE_STEPS } from "../config";
import { REQUIREMENTS_COPY } from "../copy";

const PRICE = REQUIREMENTS_COPY.price;

export interface PriceSliderModel {
  min: number;
  max: number;
  step: number;
  from: number;
  to: number;
  valueText: string;
  format: (value: number) => string;
  /** The price range a slider position stands for; an end at the bound means "no limit". */
  toPrice: (from: number, to: number) => PriceRange;
}

const euro = (value: number): string => PRICE.euro(formatInteger(value));

/** Price range over the page's own bounds; null when the bounds leave nothing to slide. */
export function priceSliderModel(
  bounds: { min: number; max: number },
  price: PriceRange | undefined,
): PriceSliderModel | null {
  const step =
    bounds.max - bounds.min > PRICE_STEPS.wideSpan ? PRICE_STEPS.wideStep : PRICE_STEPS.narrowStep;
  const min = Math.floor(bounds.min / step) * step;
  const max = Math.ceil(bounds.max / step) * step;
  if (min >= max) return null;
  const clamp = (value: number): number => Math.min(max, Math.max(min, value));
  const from = clamp(price?.min ?? min);
  const to = clamp(price?.max ?? max);
  const valueText =
    from === min && to === max
      ? REQUIREMENTS_COPY.any
      : from === min
        ? PRICE.upTo(euro(to))
        : to === max
          ? PRICE.from(euro(from))
          : PRICE.between(euro(from), euro(to));
  return {
    min,
    max,
    step,
    from,
    to,
    valueText,
    format: euro,
    toPrice: (a, b) => ({ ...(a <= min ? {} : { min: a }), ...(b >= max ? {} : { max: b }) }),
  };
}
