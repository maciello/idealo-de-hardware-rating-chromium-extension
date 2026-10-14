import {
  BenchmarkFormatError,
  type BenchmarkSnapshot,
  type BenchmarkSource,
} from "@idealo-hw/hw-bench";
import { Alert, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { IconFileImport, IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { z } from "zod";
import { type StoredItem, useStorageItem } from "../platform/storage/use-storage-item";

interface ImportCardProps<R> {
  kind: "cpu" | "gpu";
  title: string;
  source: BenchmarkSource<R>;
  item: StoredItem<BenchmarkSnapshot<R> | null>;
  schema: z.ZodType<BenchmarkSnapshot<R>>;
}

const ACCEPT = {
  "application/json": [".json"],
  "text/csv": [".csv"],
  "text/plain": [".csv"],
  "application/vnd.ms-excel": [".csv"],
};

export function ImportCard<R>({ kind, title, source, item, schema }: ImportCardProps<R>) {
  const [stored] = useStorageItem(item);
  const snapshot = useMemo(() => {
    const parsed = schema.safeParse(stored);
    return parsed.success ? parsed.data : null;
  }, [stored, schema]);
  const [error, setError] = useState<string | null>(null);

  const importFile = async (file: File): Promise<void> => {
    setError(null);
    try {
      const parsed = source.parse(await file.text(), { importedAt: new Date().toISOString() });
      await item.setValue(parsed);
    } catch (cause) {
      setError(
        cause instanceof BenchmarkFormatError
          ? cause.message
          : `Could not import ${file.name}: ${(cause as Error).message}`,
      );
    }
  };

  return (
    <Card withBorder padding="md" data-testid={`import-${kind}`}>
      <Stack gap="sm">
        <Title order={4}>{title}</Title>
        <Dropzone
          multiple={false}
          accept={ACCEPT}
          onDrop={(files) => {
            const [file] = files;
            if (file) void importFile(file);
          }}
          onReject={() => setError("Only .json or .csv files are accepted.")}
          data-testid={`dropzone-${kind}`}
        >
          <Group justify="center" gap="sm" mih={80} style={{ pointerEvents: "none" }}>
            <IconFileImport size={32} />
            <Text size="sm">
              Drop PassMark {kind.toUpperCase()} file (.json / .csv) or click to choose
            </Text>
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
                <b data-testid={`count-${kind}`}>{snapshot.records.length}</b> records imported
              </Text>
              <Text size="sm" c="dimmed">
                <span data-testid={`rejected-${kind}`}>{snapshot.rejected.length}</span> rows
                rejected
              </Text>
              <Text size="xs" c="dimmed">
                Imported {snapshot.importedAt ?? "at unknown time"} ({snapshot.sourceId})
              </Text>
            </Stack>
            <Button
              variant="light"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={() => void item.removeValue()}
            >
              Clear
            </Button>
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            No data imported yet.
          </Text>
        )}
      </Stack>
    </Card>
  );
}
