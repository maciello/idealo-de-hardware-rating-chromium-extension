import { Meter } from "../ui";
import { Row } from "./CardRowView";
import type { GpuReading } from "./gpu-reading";
import { type GpuLineModel, gpuLineModel } from "./present-gpu";
import { gpuCardSections } from "./present-gpu-card";

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

/** The chip's GPU model for a reading: the line's GPU only; the companion iGPU lives in the card. */
export const gpuChipModel = (gpu: GpuReading | null): GpuLineModel | null =>
  gpu === null ? null : gpuLineModel(gpu.primary);

/** The card's GPU sections: the line's GPU, then the CPU's iGPU when a dedicated card took the line. */
export function GpuCardSections({ gpu }: { gpu: GpuReading }) {
  return gpuCardSections(gpu).map((section) => (
    <div key={section.testId} data-testid={section.testId}>
      <div className="hw-card__head">
        <div className="hw-card__title">{section.title}</div>
        <div className="hw-card__sub">{section.sub}</div>
      </div>
      <div className="hw-card__rows">
        {section.rows.map((row) => (
          <Row key={row.id} row={row} />
        ))}
        {section.memory && <Row row={section.memory} testId={`${section.testId}-memory`} />}
      </div>
    </div>
  ));
}
