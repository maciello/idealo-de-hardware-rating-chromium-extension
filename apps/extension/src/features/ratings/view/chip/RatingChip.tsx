import { Popover } from "@mantine/core";
import { CARD_OFFSET_PX, CARD_POSITION, CARD_TRANSITION_MS, CARD_WIDTH_PX } from "../../config";
import type { CardView, ChipView, PopoverControl } from "../../view-model";
import { RatingCard } from "../card/RatingCard";
import { CpuChipLine } from "./CpuChipLine";
import { GpuChipLine } from "./GpuChipLine";
import { SignalsChip } from "./SignalsChip";

export interface RatingChipProps {
  chip: ChipView;
  card: CardView;
  popover: PopoverControl;
  onOpenSettings: () => void;
}

/**
 * Collapsed chip in the tile; the card is a Popover dropdown that Mantine portals into the overlay.
 * HoverCard is not used because it cannot be controlled: after Escape, Enter must reopen the card.
 */
export function RatingChip({ chip, card, popover, onOpenSettings }: RatingChipProps) {
  const { target, dropdown } = popover;
  const signals = chip.signals && <SignalsChip model={chip.signals} />;
  const trailing = (line: ChipView["signalsLine"]) => (chip.signalsLine === line ? signals : null);
  return (
    <Popover
      opened={popover.opened}
      onChange={popover.setOpened}
      width={CARD_WIDTH_PX}
      position={CARD_POSITION}
      offset={CARD_OFFSET_PX}
      withinPortal
      closeOnClickOutside
      closeOnEscape
      transitionProps={{ duration: CARD_TRANSITION_MS }}
      classNames={{ dropdown: "hw-popover" }}
    >
      <Popover.Target>
        <button
          type="button"
          className="hw-chip"
          data-testid="rating-badge"
          data-status={chip.status}
          aria-label={chip.aria}
          onPointerEnter={target.onPointerEnter}
          onPointerLeave={target.onPointerLeave}
          onFocus={target.onFocus}
          onBlur={target.onBlur}
          onKeyDown={target.onKeyDown}
          onClick={target.onClick}
        >
          {chip.cpu && <CpuChipLine model={chip.model} trailing={trailing("cpu")} />}
          {chip.gpuModel && <GpuChipLine model={chip.gpuModel} trailing={trailing("gpu")} />}
          {chip.signalsLine === "own" && <span className="hw-chip__line">{signals}</span>}
        </button>
      </Popover.Target>
      <Popover.Dropdown
        onPointerEnter={dropdown.onPointerEnter}
        onPointerLeave={dropdown.onPointerLeave}
        onFocus={dropdown.onFocus}
        onBlur={dropdown.onBlur}
        data-testid="rating-card-host"
      >
        <RatingCard card={card} onOpenSettings={onOpenSettings} />
      </Popover.Dropdown>
    </Popover>
  );
}
