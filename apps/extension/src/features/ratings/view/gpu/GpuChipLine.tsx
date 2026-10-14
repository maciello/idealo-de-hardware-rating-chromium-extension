import { Meter } from "../../../../ui";
import type { GpuLineModel } from "../../view-model";

/** The GPU line of the chip: meter, headline value, "GPU" or "iGPU", and the memory figure. */
export function GpuChipLine({ model }: { model: GpuLineModel }) {
  return (
    <span
      className="hw-chip__line"
      data-testid="chip-gpu"
      data-kind={model.label}
      {...(model.unrated ? { "data-state": "unrated" } : {})}
      {...(model.title ? { title: model.title } : {})}
    >
      {model.filled !== null && <Meter filled={model.filled} testId="chip-gpu-meter" />}
      <span
        className={model.unrated ? "hw-chip__label" : "hw-chip__value"}
        data-testid="chip-gpu-value"
      >
        {model.value}
      </span>
      <span className="hw-chip__label" data-testid="chip-gpu-label">
        {model.label}
      </span>
      {model.memory && (
        <span className="hw-chip__label" data-testid="chip-gpu-memory" title={model.memory.title}>
          {model.memory.text}
        </span>
      )}
    </span>
  );
}
