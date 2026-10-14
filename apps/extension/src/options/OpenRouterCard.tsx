import { Alert, Badge, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconLink, IconLinkOff } from "@tabler/icons-react";
import { useState } from "react";
import { sendMessage } from "../messaging";
import {
  NOT_CONNECTED,
  OpenRouterStatusSchema,
  openrouterStatusItem,
} from "../storage/openrouter-status";
import { useStorageItem } from "./use-storage-item";

export function OpenRouterCard() {
  const [stored] = useStorageItem(openrouterStatusItem);
  const parsed = OpenRouterStatusSchema.safeParse(stored);
  const status = parsed.success ? parsed.data : NOT_CONNECTED;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const result = await sendMessage("connectOpenRouter", undefined);
      if (!result.ok) setError(result.error.message);
    } catch {
      setError("The extension background did not respond. Reload the extension and try again.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async (): Promise<void> => {
    setError(null);
    try {
      await sendMessage("disconnectOpenRouter", undefined);
    } catch {
      setError("The extension background did not respond. Reload the extension and try again.");
    }
  };

  return (
    <Card withBorder padding="md" data-testid="openrouter">
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={4}>AI matching (OpenRouter / Jev)</Title>
          <Badge
            color={status.connected ? "green" : "gray"}
            variant="light"
            data-testid="openrouter-status"
          >
            {status.connected ? "Connected" : "Not connected"}
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          Optional. Connect your OpenRouter account so the extension can ask the Jev decision model
          to resolve titles the built-in matcher cannot. You approve access on openrouter.ai; the
          resulting API key is stored in this browser and only used by the extension background.
        </Text>
        {status.connected && (
          <Text size="sm" data-testid="openrouter-details">
            Account {status.userId}, connected{" "}
            {status.obtainedAt ? new Date(status.obtainedAt).toLocaleString() : ""}
          </Text>
        )}
        {error && (
          <Alert color="red" variant="light" data-testid="openrouter-error">
            {error}
          </Alert>
        )}
        <Group gap="xs">
          <Button
            leftSection={<IconLink size={16} />}
            loading={busy}
            disabled={status.connected}
            onClick={() => void connect()}
            data-testid="openrouter-connect"
          >
            Connect OpenRouter
          </Button>
          <Button
            variant="light"
            color="red"
            leftSection={<IconLinkOff size={16} />}
            disabled={!status.connected}
            onClick={() => void disconnect()}
            data-testid="openrouter-disconnect"
          >
            Disconnect
          </Button>
        </Group>
        <Text size="xs" c="dimmed">
          Disconnect deletes the key from this browser only. To revoke it, delete the key at
          openrouter.ai/settings/keys.
        </Text>
      </Stack>
    </Card>
  );
}
