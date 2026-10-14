import { ActionIcon, Box, Button, Group, Text } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { FILTERS_COPY } from "../copy";
import type { FilterActions, FilterViewModel } from "../view-model";

export interface PanelFooterProps {
  model: FilterViewModel;
  actions: FilterActions;
}

/** Sticky bar at the bottom of the drawer: settings, reset, hit estimate and the apply button. */
export function PanelFooter({ model, actions }: PanelFooterProps) {
  return (
    <Box
      style={{
        position: "sticky",
        bottom: 0,
        background: "var(--mantine-color-body)",
        borderTop: "1px solid var(--hw-line)",
        paddingBlock: "var(--mantine-spacing-xs)",
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <ActionIcon
            variant="subtle"
            aria-label={FILTERS_COPY.settingsAria}
            onClick={actions.openSettings}
          >
            <IconSettings size={18} />
          </ActionIcon>
          <Button variant="default" onClick={actions.reset}>
            {FILTERS_COPY.reset}
          </Button>
        </Group>
        <Group gap="sm" wrap="nowrap">
          {model.hits !== null && (
            <Text size="sm" fw={600} data-testid="hits">
              {model.hits}
            </Text>
          )}
          <Button disabled={model.applyDisabled} onClick={actions.apply} data-testid="apply">
            {FILTERS_COPY.open}
          </Button>
        </Group>
      </Group>
    </Box>
  );
}
