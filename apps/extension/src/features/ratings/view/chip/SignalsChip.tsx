import { IconFlag } from "@tabler/icons-react";
import type { SignalsChipModel } from "../../view-model";

/** The product's signals on the chip: the older-memory tag, then the count of its other red and amber flags. */
export function SignalsChip({ model }: { model: SignalsChipModel }) {
  const { memory, flags } = model;
  return (
    <>
      {memory !== null && (
        <span className="hw-chip__tag" title={memory.title} data-testid="chip-memory">
          {memory.text}
        </span>
      )}
      {flags !== null && (
        <span
          className="hw-chip__flags"
          data-severity={flags.severity}
          role="img"
          aria-label={flags.label}
          title={flags.label}
          data-testid="chip-flags"
        >
          <IconFlag aria-hidden />
          <span aria-hidden>{flags.count}</span>
        </span>
      )}
    </>
  );
}
