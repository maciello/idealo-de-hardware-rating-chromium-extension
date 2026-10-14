import { Button, Card, Stack, Text, Title } from "@mantine/core";
import { IconBug } from "@tabler/icons-react";
import { useState } from "react";
import { exportDebugReport } from "../diagnostics/export";
import { recordError } from "../platform/errors";
import { findTargetTab } from "../platform/tabs";

export function DiagnosticsCard() {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const exportReport = async (): Promise<void> => {
    setBusy(true);
    setNote(null);
    try {
      setNote(`Saved ${await exportDebugReport(await findTargetTab())}`);
    } catch (cause) {
      void recordError("options", cause);
      setNote("Could not create the report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card withBorder padding="md" data-testid="diagnostics">
      <Stack gap="sm">
        <Title order={4}>Diagnostics</Title>
        <Text size="sm" c="dimmed">
          Saves a small file for bug reports: extension version, settings, benchmark data counts,
          the last AI test, recent errors and, for your open idealo tab, how many products were
          found and rated. It contains no API keys, benchmark records or page content.
        </Text>
        <div>
          <Button
            variant="light"
            leftSection={<IconBug size={16} />}
            loading={busy}
            onClick={() => void exportReport()}
            data-testid="debug-report-export"
          >
            Export debug report
          </Button>
        </div>
        {note && (
          <Text size="sm" role="status" data-testid="debug-report-note">
            {note}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
