import { Alert, Badge, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconCheck, IconFlask, IconLink, IconLinkOff, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { recordError } from "../diagnostics/error-log";
import { sendMessage } from "../messaging";
import { AiTestResultSchema, aiTestResultItem } from "../storage/ai-test-result";
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
  const [storedTest] = useStorageItem(aiTestResultItem);
  const parsedTest = AiTestResultSchema.safeParse(storedTest);
  const lastTest = parsedTest.success ? parsedTest.data : null;
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const result = await sendMessage("connectOpenRouter", undefined);
      if (!result.ok) setError(result.error.message);
    } catch (cause) {
      void recordError("options", cause);
      setError("The extension background did not respond. Reload the extension and try again.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async (): Promise<void> => {
    setError(null);
    try {
      await sendMessage("disconnectOpenRouter", undefined);
    } catch (cause) {
      void recordError("options", cause);
      setError("The extension background did not respond. Reload the extension and try again.");
    }
  };

  const runTest = async (): Promise<void> => {
    setTesting(true);
    setError(null);
    try {
      await sendMessage("testAiMatching", undefined);
    } catch (cause) {
      void recordError("options", cause);
      setError("The extension background did not respond. Reload the extension and try again.");
    } finally {
      setTesting(false);
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
        {lastTest && (
          <Alert
            color={lastTest.ok ? "green" : "red"}
            variant="light"
            icon={lastTest.ok ? <IconCheck size={16} /> : <IconX size={16} />}
            title={`AI test, ${new Date(lastTest.at).toLocaleString()}`}
            data-testid="openrouter-test-result"
          >
            {lastTest.ok
              ? `Working: picked ${lastTest.picked} in ${lastTest.latencyMs} ms, model ${lastTest.model}`
              : `Failed: ${lastTest.error}`}
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
            leftSection={<IconFlask size={16} />}
            loading={testing}
            disabled={!status.connected}
            onClick={() => void runTest()}
            data-testid="openrouter-test"
          >
            Test AI matching
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
