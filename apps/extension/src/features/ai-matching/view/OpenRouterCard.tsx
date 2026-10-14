import { Alert, Badge, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconCheck, IconFlask, IconLink, IconLinkOff, IconX } from "@tabler/icons-react";
import { AI_COPY } from "../copy";

interface OpenRouterCardProps {
  connected: boolean;
  details: string | null;
  error: string | null;
  test: { ok: boolean; title: string; message: string } | null;
  connecting: boolean;
  testing: boolean;
  onConnect(): void;
  onTest(): void;
  onDisconnect(): void;
}

export function OpenRouterCard({
  connected,
  details,
  error,
  test,
  connecting,
  testing,
  onConnect,
  onTest,
  onDisconnect,
}: OpenRouterCardProps) {
  return (
    <Card withBorder padding="md" data-testid="openrouter">
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={4}>{AI_COPY.cardTitle}</Title>
          <Badge
            color={connected ? "green" : "gray"}
            variant="light"
            data-testid="openrouter-status"
          >
            {connected ? AI_COPY.connected : AI_COPY.notConnected}
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          {AI_COPY.description}
        </Text>
        {details !== null && (
          <Text size="sm" data-testid="openrouter-details">
            {details}
          </Text>
        )}
        {error && (
          <Alert color="red" variant="light" data-testid="openrouter-error">
            {error}
          </Alert>
        )}
        {test && (
          <Alert
            color={test.ok ? "green" : "red"}
            variant="light"
            icon={test.ok ? <IconCheck size={16} /> : <IconX size={16} />}
            title={test.title}
            data-testid="openrouter-test-result"
          >
            {test.message}
          </Alert>
        )}
        <Group gap="xs">
          <Button
            leftSection={<IconLink size={16} />}
            loading={connecting}
            disabled={connected}
            onClick={onConnect}
            data-testid="openrouter-connect"
          >
            {AI_COPY.connect}
          </Button>
          <Button
            variant="light"
            leftSection={<IconFlask size={16} />}
            loading={testing}
            disabled={!connected}
            onClick={onTest}
            data-testid="openrouter-test"
          >
            {AI_COPY.test}
          </Button>
          <Button
            variant="light"
            color="red"
            leftSection={<IconLinkOff size={16} />}
            disabled={!connected}
            onClick={onDisconnect}
            data-testid="openrouter-disconnect"
          >
            {AI_COPY.disconnect}
          </Button>
        </Group>
        <Text size="xs" c="dimmed">
          {AI_COPY.disconnectNote}
        </Text>
      </Stack>
    </Card>
  );
}
