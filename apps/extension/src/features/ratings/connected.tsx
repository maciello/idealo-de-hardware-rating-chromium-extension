import type { Signal } from "@idealo-hw/sensors";
import { type ChipInput, useHoverPopover } from "./controller";
import type { GpuReading } from "./model";
import { RatingChip } from "./view/RatingChip";
import { cardViewOf, chipViewOf } from "./view-model";

export type ConnectedRatingChipProps = Omit<ChipInput, "gpu" | "signals"> & {
  gpu?: GpuReading | null | undefined;
  signals?: readonly Signal[] | undefined;
  onOpenSettings: () => void;
};

/** A chip wired to its hover state: draws what the CPU rating, GPU reading and signals say, or nothing. */
export function ConnectedRatingChip({
  rating,
  gpu = null,
  signals = [],
  primaryId,
  importedAt,
  onOpenSettings,
}: ConnectedRatingChipProps) {
  const popover = useHoverPopover();
  const chip = chipViewOf(rating, gpu, primaryId, signals);
  if (chip === null) return null;
  return (
    <RatingChip
      chip={chip}
      card={cardViewOf(chip.cpu, gpu, signals, importedAt)}
      popover={popover}
      onOpenSettings={onOpenSettings}
    />
  );
}
