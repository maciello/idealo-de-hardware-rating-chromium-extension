import type { GpuCardSection } from "../../view-model";
import { CardHead } from "./CardHead";
import { CardRow } from "./CardRow";

/** The card's GPU sections: the line's GPU, then the CPU's iGPU when a dedicated card took the line. */
export function GpuCardSections({ sections }: { sections: readonly GpuCardSection[] }) {
  return sections.map((section) => (
    <div key={section.testId} data-testid={section.testId}>
      <CardHead title={section.title} sub={section.sub} />
      <div className="hw-card__rows">
        {section.rows.map((row) => (
          <CardRow key={row.id} row={row} />
        ))}
        {section.memory && <CardRow row={section.memory} testId={`${section.testId}-memory`} />}
      </div>
    </div>
  ));
}
