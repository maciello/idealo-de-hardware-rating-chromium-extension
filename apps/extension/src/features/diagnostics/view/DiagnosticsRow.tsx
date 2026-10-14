import { Button, Group, Stack } from "@mantine/core";
import { IconBug } from "@tabler/icons-react";
import { LabeledRow, StatusNote } from "../../../ui";
import { DIAGNOSTICS_COPY } from "../copy";

interface DiagnosticsRowProps {
  note: string | null;
  onExport(): void;
}

export function DiagnosticsRow({ note, onExport }: DiagnosticsRowProps) {
  return (
    <LabeledRow label={DIAGNOSTICS_COPY.rowLabel} stacked>
      <Stack gap={8}>
        <Group>
          <Button
            size="compact-sm"
            variant="default"
            leftSection={<IconBug size={14} />}
            onClick={onExport}
            data-testid="popup-debug-report"
          >
            {DIAGNOSTICS_COPY.exportReport}
          </Button>
        </Group>
        {note && (
          <StatusNote tone="muted" testId="popup-debug-note">
            {note}
          </StatusNote>
        )}
      </Stack>
    </LabeledRow>
  );
}
