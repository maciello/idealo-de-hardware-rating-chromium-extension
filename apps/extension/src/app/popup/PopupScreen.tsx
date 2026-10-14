import { Anchor, Button, Stack, Text } from "@mantine/core";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { OpenRouterConnectedRow } from "../../features/ai-matching";
import { BenchmarkSummary, useBenchmarkSummary } from "../../features/benchmark-data";
import { CaptureConnectedRow } from "../../features/capture";
import { DiagnosticsConnectedRow } from "../../features/diagnostics";
import { PrimaryNumberConnectedRow } from "../../features/settings";
import { openOptions } from "../../platform/tabs";
import { LabeledRow } from "../../ui";
import { POPUP_COPY } from "./copy";
import { usePageStatus } from "./use-page-status";

function BenchmarkRow() {
  return <BenchmarkSummary {...useBenchmarkSummary()} />;
}

export function PopupScreen() {
  const { tab, summary, canFilter, openFilterBuilder } = usePageStatus();

  return (
    <Stack gap="md" p="md" data-testid="popup">
      <Text fz="lg" fw={600}>
        {POPUP_COPY.title}
      </Text>
      <BenchmarkRow />
      <LabeledRow label={POPUP_COPY.thisPage}>
        <Text fz="sm" data-testid="popup-page">
          {summary}
        </Text>
      </LabeledRow>
      <PrimaryNumberConnectedRow />
      <Button
        variant="default"
        leftSection={<IconAdjustmentsHorizontal size={16} />}
        disabled={!canFilter}
        onClick={() => void openFilterBuilder()}
        data-testid="popup-filter"
      >
        {POPUP_COPY.openFilterBuilder}
      </Button>
      <OpenRouterConnectedRow />
      <CaptureConnectedRow tab={tab} />
      <DiagnosticsConnectedRow tab={tab} />
      <Anchor
        component="button"
        type="button"
        fz="sm"
        ta="left"
        onClick={openOptions}
        data-testid="popup-settings"
      >
        {POPUP_COPY.settings}
      </Anchor>
    </Stack>
  );
}
