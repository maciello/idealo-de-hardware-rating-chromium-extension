import { Button, Group, Stack, Switch } from "@mantine/core";
import { IconDownload, IconFileExport } from "@tabler/icons-react";
import { LabeledRow, StatusNote } from "../../../ui";
import { CAPTURE_COPY } from "../copy";

interface CaptureRowProps {
  enabled: boolean;
  switchLabel: string;
  canExport: boolean;
  canSnapshot: boolean;
  note: string | null;
  onToggle(enabled: boolean): void;
  onExport(): void;
  onSnapshot(): void;
}

export function CaptureRow({
  enabled,
  switchLabel,
  canExport,
  canSnapshot,
  note,
  onToggle,
  onExport,
  onSnapshot,
}: CaptureRowProps) {
  return (
    <LabeledRow label={CAPTURE_COPY.rowLabel} stacked>
      <Stack gap={8}>
        <Group justify="space-between" wrap="nowrap">
          <Switch
            size="sm"
            label={switchLabel}
            checked={enabled}
            onChange={(event) => onToggle(event.currentTarget.checked)}
            data-testid="popup-capture"
          />
        </Group>
        <Group gap="xs">
          <Button
            size="compact-sm"
            variant="default"
            leftSection={<IconFileExport size={14} />}
            disabled={!canExport}
            onClick={onExport}
            data-testid="popup-export"
          >
            {CAPTURE_COPY.export}
          </Button>
          <Button
            size="compact-sm"
            variant="default"
            leftSection={<IconDownload size={14} />}
            disabled={!canSnapshot}
            onClick={onSnapshot}
            data-testid="popup-snapshot"
          >
            {CAPTURE_COPY.saveSnapshot}
          </Button>
        </Group>
        {note && (
          <StatusNote tone="muted" testId="popup-note">
            {note}
          </StatusNote>
        )}
      </Stack>
    </LabeledRow>
  );
}
