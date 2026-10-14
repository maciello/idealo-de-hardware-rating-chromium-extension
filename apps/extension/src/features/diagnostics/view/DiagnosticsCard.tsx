import { Button, Card, Stack, Text, Title } from "@mantine/core";
import { IconBug } from "@tabler/icons-react";
import { DIAGNOSTICS_COPY } from "../copy";

interface DiagnosticsCardProps {
  busy: boolean;
  note: string | null;
  onExport(): void;
}

export function DiagnosticsCard({ busy, note, onExport }: DiagnosticsCardProps) {
  return (
    <Card withBorder padding="md" data-testid="diagnostics">
      <Stack gap="sm">
        <Title order={4}>{DIAGNOSTICS_COPY.cardTitle}</Title>
        <Text size="sm" c="dimmed">
          {DIAGNOSTICS_COPY.description}
        </Text>
        <div>
          <Button
            variant="light"
            leftSection={<IconBug size={16} />}
            loading={busy}
            onClick={onExport}
            data-testid="debug-report-export"
          >
            {DIAGNOSTICS_COPY.exportReport}
          </Button>
        </div>
        {note && (
          <Text size="sm" role="status" data-testid="debug-report-note">
            {note}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
