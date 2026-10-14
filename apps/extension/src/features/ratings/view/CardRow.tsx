import { Meter } from "../../../ui";
import type { CardRow as CardRowModel } from "../view-model";

/** One label/value row of the card, with an optional percentile meter beneath. */
export function CardRow({
  row,
  testId = `card-row-${row.id}`,
}: {
  row: CardRowModel;
  testId?: string;
}) {
  return (
    <div title={row.title} data-testid={testId}>
      <div className="hw-row__main">
        <span className="hw-row__label">{row.label}</span>
        <span className="hw-row__value">{row.value}</span>
      </div>
      {row.meter && (
        <div className="hw-row__context">
          <Meter filled={row.meter.filled} />
          <span>{row.meter.text}</span>
        </div>
      )}
    </div>
  );
}
