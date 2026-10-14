import { Slider } from "@mantine/core";
import { formatInteger } from "../ui/format";
import { SliderField } from "./SliderField";
import type { ScoreSpan } from "./scorer";

export interface ScoreSliderProps {
  id: string;
  label: string;
  /** Lowest and highest score among the CPUs/GPUs the category lists. */
  span: ScoreSpan;
  step: number;
  /** Undefined = no minimum. */
  value: number | undefined;
  status?: string | null | undefined;
  onChange: (value: number | undefined) => void;
}

/** A benchmark-minimum slider over the scores of the listed models; its lowest end means "any". */
export function ScoreSlider({ id, label, span, step, value, status, onChange }: ScoreSliderProps) {
  const min = Math.floor(span.min / step) * step;
  const max = Math.ceil(span.max / step) * step;
  if (min >= max) return null;
  const current = value === undefined ? min : Math.min(max, Math.max(min, value));
  return (
    <SliderField
      id={id}
      label={`${label} ≥`}
      value={current === min ? "any" : formatInteger(current)}
      status={status}
    >
      <Slider
        size="xs"
        inverted
        min={min}
        max={max}
        step={step}
        value={current}
        label={formatInteger}
        thumbLabel={label}
        onChange={(next) => onChange(next <= min ? undefined : next)}
      />
    </SliderField>
  );
}
