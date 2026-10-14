import type { PriceRange as Price } from "@idealo-hw/idealo-query";
import { Group, NumberInput } from "@mantine/core";
import { useEffect, useState } from "react";
import { FILTERS_COPY } from "../copy";
import { isInverted, type PriceInput, priceRangeOf } from "../model";

export interface PriceRangeProps {
  price: Price | undefined;
  onChange: (price: Price) => void;
}

/** Min and max price inputs; an inverted pair shows an error and is not applied. */
export function PriceRange({ price, onChange }: PriceRangeProps) {
  const [min, setMin] = useState<PriceInput>(price?.min ?? "");
  const [max, setMax] = useState<PriceInput>(price?.max ?? "");

  useEffect(() => {
    setMin(price?.min ?? "");
    setMax(price?.max ?? "");
  }, [price?.min, price?.max]);

  const commit = (nextMin: PriceInput, nextMax: PriceInput) => {
    const range = priceRangeOf(nextMin, nextMax);
    if (range !== null) onChange(range);
  };

  return (
    <Group grow align="flex-start">
      <NumberInput
        label={FILTERS_COPY.priceMinLabel}
        min={0}
        value={min}
        data-testid="price-min"
        onChange={(value) => {
          setMin(value);
          commit(value, max);
        }}
        error={isInverted(min, max) ? FILTERS_COPY.priceInverted : undefined}
      />
      <NumberInput
        label={FILTERS_COPY.priceMaxLabel}
        min={0}
        value={max}
        data-testid="price-max"
        onChange={(value) => {
          setMax(value);
          commit(min, value);
        }}
      />
    </Group>
  );
}
