import type { BenchmarkSnapshot } from "@idealo-hw/hw-bench";
import { Alert, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { IconFileImport, IconTrash } from "@tabler/icons-react";
import { DROPZONE_ICON_SIZE, DROPZONE_MIN_HEIGHT, IMPORT_ACCEPT } from "../config";
import { IMPORT_COPY } from "../copy";

interface ImportCardProps {
  kind: "cpu" | "gpu";
  title: string;
  snapshot: Pick<
    BenchmarkSnapshot<unknown>,
    "records" | "rejected" | "importedAt" | "sourceId"
  > | null;
  error: string | null;
  onFile(file: File): void;
  onReject(): void;
  onClear(): void;
}

export function ImportCard({
  kind,
  title,
  snapshot,
  error,
  onFile,
  onReject,
  onClear,
}: ImportCardProps) {
  return (
    <Card withBorder padding="md" data-testid={`import-${kind}`}>
      <Stack gap="sm">
        <Title order={4}>{title}</Title>
        <Dropzone
          multiple={false}
          accept={IMPORT_ACCEPT}
          onDrop={(files) => {
            const [file] = files;
            if (file) onFile(file);
          }}
          onReject={onReject}
          data-testid={`dropzone-${kind}`}
        >
          <Group
            justify="center"
            gap="sm"
            mih={DROPZONE_MIN_HEIGHT}
            style={{ pointerEvents: "none" }}
          >
            <IconFileImport size={DROPZONE_ICON_SIZE} />
            <Text size="sm">{IMPORT_COPY.drop(kind)}</Text>
          </Group>
        </Dropzone>
        {error && (
          <Alert color="red" data-testid={`import-error-${kind}`}>
            {error}
          </Alert>
        )}
        {snapshot ? (
          <Group justify="space-between" align="flex-start">
            <Stack gap={2} data-testid={`import-status-${kind}`}>
              <Text size="sm">
                <b data-testid={`count-${kind}`}>{snapshot.records.length}</b>{" "}
                {IMPORT_COPY.recordsImported}
              </Text>
              <Text size="sm" c="dimmed">
                <span data-testid={`rejected-${kind}`}>{snapshot.rejected.length}</span>{" "}
                {IMPORT_COPY.rowsRejected}
              </Text>
              <Text size="xs" c="dimmed">
                {IMPORT_COPY.importedAt(snapshot.importedAt, snapshot.sourceId)}
              </Text>
            </Stack>
            <Button
              variant="light"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={onClear}
            >
              {IMPORT_COPY.clear}
            </Button>
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            {IMPORT_COPY.empty}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
