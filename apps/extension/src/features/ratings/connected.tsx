import { type ChipInput, useHoverPopover } from "./controller";
import type { GpuReading } from "./model";
import { RatingChip } from "./view/RatingChip";
import { cardViewOf, chipViewOf } from "./view-model";

export type ConnectedRatingChipProps = Omit<ChipInput, "gpu"> & {
  gpu?: GpuReading | null | undefined;
  onOpenSettings: () => void;
};

/** A chip wired to its hover state: draws what the CPU rating and GPU reading say, or nothing. */
export function ConnectedRatingChip({
  rating,
  gpu = null,
  primaryId,
  importedAt,
  onOpenSettings,
}: ConnectedRatingChipProps) {
  const popover = useHoverPopover();
  const chip = chipViewOf(rating, gpu, primaryId);
  if (chip === null) return null;
  return (
    <RatingChip
      chip={chip}
      card={cardViewOf(chip.cpu, gpu, importedAt)}
      popover={popover}
      onOpenSettings={onOpenSettings}
    />
  );
}
