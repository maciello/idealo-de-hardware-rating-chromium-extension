import type { GpuCardSection } from "../../view-model";
import { CardRow } from "./CardRow";

/** The card's GPU sections: the line's GPU, then the CPU's iGPU when a dedicated card took the line. */
export function GpuCardSections({ sections }: { sections: readonly GpuCardSection[] }) {
  return sections.map((section) => (
    <div key={section.testId} data-testid={section.testId}>
      <div className="hw-card__head">
        <div className="hw-card__title">{section.title}</div>
        <div className="hw-card__sub">{section.sub}</div>
      </div>
      <div className="hw-card__rows">
        {section.rows.map((row) => (
          <CardRow key={row.id} row={row} />
        ))}
        {section.memory && <CardRow row={section.memory} testId={`${section.testId}-memory`} />}
      </div>
    </div>
  ));
}
