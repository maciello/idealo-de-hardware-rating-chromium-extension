import { ActionIcon, Tooltip } from "@mantine/core";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { Z_INDEX } from "../../../ui";
import { FAB } from "../config";
import { FILTERS_COPY } from "../copy";

/** The button fixed to the page corner that opens the drawer. */
export function FilterFab({ onOpen }: { onOpen: () => void }) {
  return (
    <Tooltip label={FILTERS_COPY.title} position="left">
      <ActionIcon
        size={FAB.size}
        radius="xl"
        variant="filled"
        aria-label={FILTERS_COPY.fabAria}
        data-testid="filter-fab"
        data-hw-interactive=""
        onClick={onOpen}
        style={{ position: "fixed", right: FAB.inset, bottom: FAB.inset, zIndex: Z_INDEX - 1 }}
      >
        <IconAdjustmentsHorizontal size={FAB.iconSize} />
      </ActionIcon>
    </Tooltip>
  );
}
