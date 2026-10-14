import { Button, Card, Group, Stack, Switch, Text, Title } from "@mantine/core";
import { IconDownload, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { captureRing } from "../capture/ring";
import { captureModeItem } from "../storage/items";
import { useStorageItem } from "./use-storage-item";

function download(filename: string, json: unknown): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(json, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

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
    download(`idealo-captures-${new Date().toISOString().slice(0, 10)}.json`, {
      exportedAt: new Date().toISOString(),
      captures,
    });
  };

  return (
    <Card withBorder padding="md" data-testid="capture">
      <Stack gap="sm">
        <Title order={4}>Network capture</Title>
        <Text size="sm" c="dimmed">
          Records same-origin JSON responses idealo.de already loads in your browser (newest 300),
          so filter and spec adapters can be written from real data. Nothing is sent anywhere.
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
