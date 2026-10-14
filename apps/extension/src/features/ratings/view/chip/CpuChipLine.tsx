import { IconFlame, IconLeaf } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Meter } from "../../../../ui";
import { RATINGS_COPY } from "../../copy";
import type { ChipModel } from "../../view-model";

/**
 * The CPU line of the chip; without a model (ambiguous match) it only says the CPU is unresolved.
 * `trailing` is where the product's signals sit when this is the chip's first line.
 */
export function CpuChipLine({
  model,
  trailing,
}: {
  model: ChipModel | null;
  trailing?: ReactNode;
}) {
  return (
    <span className="hw-chip__line" data-testid="chip-cpu">
      {model ? (
        <>
          {model.filled !== null && <Meter filled={model.filled} />}
          <span className="hw-chip__value" data-testid="chip-value">
            {model.value}
          </span>
          <span className="hw-chip__label">{model.label}</span>
          {model.power !== null && (
            <span
              className="hw-chip__power"
              data-level={model.power.level}
              role="img"
              aria-label={model.power.label}
              title={model.power.label}
              data-testid="chip-power"
            >
              {model.power.level === "low" ? <IconLeaf aria-hidden /> : <IconFlame aria-hidden />}
            </span>
          )}
        </>
      ) : (
        <span className="hw-chip__value">{RATINGS_COPY.cpuUnresolved}</span>
      )}
      {trailing}
    </span>
  );
}
