import { Button, Group, Text } from "@mantine/core";
import { LabeledRow, MutedText, StatusNote } from "../../../ui";
import { AI_COPY } from "../copy";

interface AiMatchingRowProps {
  connected: boolean;
  busy: boolean;
  error: string | null;
  onConnect(): void;
  onDisconnect(): void;
}

export function AiMatchingRow({
  connected,
  busy,
  error,
  onConnect,
  onDisconnect,
}: AiMatchingRowProps) {
  return (
    <LabeledRow label={AI_COPY.rowLabel} stacked>
      <Group justify="space-between" wrap="nowrap" gap="xs">
        {connected ? (
          <>
            <Text fz="sm" data-testid="popup-ai">
              {AI_COPY.connected}
            </Text>
            <Button size="compact-sm" variant="default" loading={busy} onClick={onDisconnect}>
              {AI_COPY.disconnect}
            </Button>
          </>
        ) : (
          <>
            <MutedText fz="sm" data-testid="popup-ai">
              {AI_COPY.notConnected}
            </MutedText>
            <Button
              size="compact-sm"
              loading={busy}
              onClick={onConnect}
              data-testid="popup-connect"
            >
              {AI_COPY.connect}
            </Button>
          </>
        )}
      </Group>
      {error && (
        <StatusNote tone="error" mt={4}>
          {error}
        </StatusNote>
      )}
    </LabeledRow>
  );
}
