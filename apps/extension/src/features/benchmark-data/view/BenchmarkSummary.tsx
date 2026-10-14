import { Button, Group, Text } from "@mantine/core";
import { LabeledRow } from "../../../ui";
import { SUMMARY_COPY } from "../copy";

interface BenchmarkSummaryProps {
  text: string;
  onImport(): void;
}

export function BenchmarkSummary({ text, onImport }: BenchmarkSummaryProps) {
  return (
    <LabeledRow label={SUMMARY_COPY.label} stacked>
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text fz="sm" data-testid="popup-data">
          {text}
        </Text>
        <Button size="compact-sm" variant="default" onClick={onImport} data-testid="popup-import">
          {SUMMARY_COPY.importButton}
        </Button>
      </Group>
    </LabeledRow>
  );
}
