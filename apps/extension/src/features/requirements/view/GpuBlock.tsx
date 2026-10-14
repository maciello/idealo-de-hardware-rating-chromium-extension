import { Text } from "@mantine/core";
import { REQUIREMENTS_COPY } from "../copy";
import type { GpuBlockModel } from "../view-model";
import { ScoreSlider } from "./ScoreSlider";

export interface GpuBlockProps {
  model: GpuBlockModel;
  onMinimum: (value: number | undefined) => void;
}

/** The G3D minimum, or the hint to import PassMark GPU data first. */
export function GpuBlock({ model, onMinimum }: GpuBlockProps) {
  if (model.state === "no-data") {
    return (
      <Text size="xs" c="dimmed" data-testid="req-no-gpu-data">
        {REQUIREMENTS_COPY.noGpuData}
      </Text>
    );
  }
  return model.g3d && <ScoreSlider model={model.g3d} onChange={onMinimum} />;
}
