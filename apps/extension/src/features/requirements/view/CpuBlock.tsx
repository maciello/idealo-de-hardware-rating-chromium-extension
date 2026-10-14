import { type Combine, METRIC, type Metric } from "@idealo-hw/idealo-query";
import { SegmentedControl, Stack, Text } from "@mantine/core";
import { REQUIREMENTS_COPY } from "../copy";
import type { CpuBlockModel } from "../view-model";
import { ScoreSlider } from "./ScoreSlider";

const COPY = REQUIREMENTS_COPY;

export interface CpuBlockProps {
  model: CpuBlockModel;
  onMinimum: (metric: Metric, value: number | undefined) => void;
  onCombine: (combine: Combine) => void;
}

/** CPU benchmark minimums, or the hint to import PassMark CPU data first. */
export function CpuBlock({ model, onMinimum, onCombine }: CpuBlockProps) {
  if (model.state === "no-data") {
    return (
      <Text size="xs" c="dimmed" data-testid="req-no-cpu-data">
        {COPY.noCpuData}
      </Text>
    );
  }
  return (
    <Stack gap={4}>
      {model.mark && (
        <ScoreSlider model={model.mark} onChange={(value) => onMinimum(METRIC.cpuMark, value)} />
      )}
      <SegmentedControl
        size="xs"
        w="fit-content"
        data={[
          { value: "all", label: COPY.combineAnd },
          { value: "any", label: COPY.combineOr },
        ]}
        value={model.combine}
        disabled={model.combineDisabled}
        onChange={onCombine}
        data-testid="req-combine"
        aria-label={COPY.combineAria}
      />
      {model.single && (
        <ScoreSlider
          model={model.single}
          onChange={(value) => onMinimum(METRIC.cpuSingle, value)}
        />
      )}
      {model.status && (
        <Text size="xs" c="dimmed" data-testid="req-status-cpu_model">
          {model.status}
        </Text>
      )}
    </Stack>
  );
}
