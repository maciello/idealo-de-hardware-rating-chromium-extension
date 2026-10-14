import type { Combine, Metric } from "@idealo-hw/idealo-query";
import { SegmentedControl, Stack, Text } from "@mantine/core";
import { GAP } from "../../../../ui";
import { REQUIREMENTS_COPY } from "../../copy";
import type { CpuBlockModel } from "../../view-model";
import { ScoreSlider } from "../sliders/ScoreSlider";
import { ImportHint } from "./ImportHint";

const COPY = REQUIREMENTS_COPY;

export interface CpuBlockProps {
  model: CpuBlockModel;
  onMinimum: (metric: Metric, value: number | undefined) => void;
  onCombine: (combine: Combine) => void;
  onOpenSettings: () => void;
}

/** CPU benchmark minimums, or the hint to import PassMark CPU data first. */
export function CpuBlock({ model, onMinimum, onCombine, onOpenSettings }: CpuBlockProps) {
  if (model.state === "no-data") {
    return (
      <ImportHint text={COPY.noCpuData} testId="req-no-cpu-data" onOpenSettings={onOpenSettings} />
    );
  }
  const { mark, single } = model;
  return (
    <Stack gap={GAP.tight}>
      {mark && <ScoreSlider model={mark} onChange={(value) => onMinimum(mark.metric, value)} />}
      <SegmentedControl
        size="xs"
        w="fit-content"
        data={COPY.combineOptions}
        value={model.combine}
        disabled={model.combineDisabled}
        onChange={onCombine}
        data-testid="req-combine"
        aria-label={COPY.combineAria}
      />
      {single && (
        <ScoreSlider model={single} onChange={(value) => onMinimum(single.metric, value)} />
      )}
      {model.status && (
        <Text size="xs" c="dimmed" data-testid="req-status-cpu_model">
          {model.status}
        </Text>
      )}
    </Stack>
  );
}
