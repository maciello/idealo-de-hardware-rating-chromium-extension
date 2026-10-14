import { Button, Card, Group, Stack, Switch, Text, Title } from "@mantine/core";
import { IconDownload, IconTrash } from "@tabler/icons-react";
import { CAPTURE_COPY } from "../copy";

interface CaptureCardProps {
  enabled: boolean;
  count: number;
  onToggle(enabled: boolean): void;
  onExport(): void;
  onClear(): void;
}

export function CaptureCard({ enabled, count, onToggle, onExport, onClear }: CaptureCardProps) {
  return (
    <Card withBorder padding="md" data-testid="capture">
      <Stack gap="sm">
        <Title order={4}>{CAPTURE_COPY.cardTitle}</Title>
        <Text size="sm" c="dimmed">
          {CAPTURE_COPY.description}
        </Text>
        <Switch
          label={CAPTURE_COPY.captureMode}
          checked={enabled}
          onChange={(event) => onToggle(event.currentTarget.checked)}
          data-testid="capture-mode"
        />
        <Group justify="space-between">
          <Text size="sm" data-testid="capture-count">
            {CAPTURE_COPY.captured(count)}
          </Text>
          <Group gap="xs">
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              disabled={count === 0}
              onClick={onExport}
              data-testid="capture-export"
            >
              {CAPTURE_COPY.exportResponses}
            </Button>
            <Button
              variant="light"
              color="red"
              leftSection={<IconTrash size={16} />}
              disabled={count === 0}
              onClick={onClear}
            >
              {CAPTURE_COPY.clear}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Card>
  );
}
