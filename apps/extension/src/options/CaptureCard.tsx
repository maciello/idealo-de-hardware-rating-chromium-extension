import { Button, Card, Group, Stack, Switch, Text, Title } from "@mantine/core";
import { IconDownload, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { captureRing } from "../capture/ring";
import { downloadJson } from "../platform/download";
import { captureModeItem } from "../platform/storage";
import { useStorageItem } from "../platform/storage/use-storage-item";

export function CaptureCard() {
  const [stored, setCaptureMode] = useStorageItem(captureModeItem);
  const enabled = stored ?? false;
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = (): void => void captureRing.count().then(setCount);
    refresh();
    return captureRing.watch(refresh);
  }, []);

  const exportAll = async (): Promise<void> => {
    const captures = await captureRing.list();
    downloadJson("captures", { captures });
  };

  return (
    <Card withBorder padding="md" data-testid="capture">
      <Stack gap="sm">
        <Title order={4}>Network capture</Title>
        <Text size="sm" c="dimmed">
          Records the url, method and status of idealo requests (newest 300), plus the body of their
          JSON responses, so filter and spec adapters can be written from real data. Requests to
          other hosts are not recorded. Nothing is sent anywhere.
        </Text>
        <Switch
          label="Capture mode"
          checked={enabled}
          onChange={(event) => setCaptureMode(event.currentTarget.checked)}
          data-testid="capture-mode"
        />
        <Group justify="space-between">
          <Text size="sm" data-testid="capture-count">
            {count} captured
          </Text>
          <Group gap="xs">
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              disabled={count === 0}
              onClick={() => void exportAll()}
              data-testid="capture-export"
            >
              Export captured responses
            </Button>
            <Button
              variant="light"
              color="red"
              leftSection={<IconTrash size={16} />}
              disabled={count === 0}
              onClick={() => void captureRing.clear()}
            >
              Clear
            </Button>
          </Group>
        </Group>
      </Stack>
    </Card>
  );
}
