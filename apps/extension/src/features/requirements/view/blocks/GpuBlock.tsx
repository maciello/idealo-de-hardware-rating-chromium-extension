import { REQUIREMENTS_COPY } from "../../copy";
import type { GpuBlockModel } from "../../view-model";
import { ScoreSlider } from "../sliders/ScoreSlider";
import { ImportHint } from "./ImportHint";

export interface GpuBlockProps {
  model: GpuBlockModel;
  onMinimum: (value: number | undefined) => void;
  onOpenSettings: () => void;
}

/** The G3D minimum, or the hint to import PassMark GPU data first. */
export function GpuBlock({ model, onMinimum, onOpenSettings }: GpuBlockProps) {
  if (model.state === "no-data") {
    return (
      <ImportHint
        text={REQUIREMENTS_COPY.noGpuData}
        testId="req-no-gpu-data"
        onOpenSettings={onOpenSettings}
      />
    );
  }
  return model.g3d && <ScoreSlider model={model.g3d} onChange={onMinimum} />;
}
