import { Alert, Button, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { REQUIREMENTS_COPY } from "../copy";

export interface ImportHintProps {
  text: string;
  testId: string;
  onOpenSettings: () => void;
}

/** What replaces a benchmark block while its PassMark export is not imported: why, and the way to the settings. */
export function ImportHint({ text, testId, onOpenSettings }: ImportHintProps) {
  return (
    <Alert variant="light" icon={<IconInfoCircle size={16} />} data-testid={testId}>
      <Stack gap={6} align="flex-start">
        <Text size="sm">{text}</Text>
        <Button
          size="compact-sm"
          variant="light"
          onClick={onOpenSettings}
          data-testid={`${testId}-open-settings`}
        >
          {REQUIREMENTS_COPY.openSettings}
        </Button>
      </Stack>
    </Alert>
  );
}
