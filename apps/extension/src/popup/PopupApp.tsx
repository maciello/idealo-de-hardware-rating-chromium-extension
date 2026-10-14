import { parseIdealoUrl } from "@idealo-hw/idealo-query";
import { Anchor, Button, Group, Stack, Text } from "@mantine/core";
import { IconAdjustmentsHorizontal, IconBug } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import type { PageStats } from "../contracts";
import { exportDebugReport } from "../diagnostics/export";
import { OpenRouterConnectedRow } from "../features/ai-matching";
import { BenchmarkSummary, useBenchmarkSummary } from "../features/benchmark-data";
import { CaptureConnectedRow } from "../features/capture";
import { PrimaryNumberConnectedRow } from "../features/settings";
import { recordError } from "../platform/errors";
import { sendMessage } from "../platform/messaging";
import { activateTab, findTargetTab, openOptions, type TargetTab } from "../platform/tabs";
import { LabeledRow, StatusNote } from "../ui";

function BenchmarkRow() {
  return <BenchmarkSummary {...useBenchmarkSummary()} />;
}

function pageSummary(tab: TargetTab | null, stats: PageStats | null | "loading"): string {
  if (tab === null || stats === null) return "Open an idealo listing or product page";
  if (stats === "loading") return "Reading this page";
  if (stats.kind === "product") {
    return stats.rated > 0 ? "This product has a CPU rating" : "No CPU rating for this product";
  }
  if (stats.kind !== "listing") return "Open an idealo listing or product page";
  if (stats.total === 0) return "No products found on this page";
  return `${stats.rated} of ${stats.total} products rated`;
}

function Diagnostics({ tab }: { tab: TargetTab | null }) {
  const [note, setNote] = useState<string | null>(null);

  const exportReport = async (): Promise<void> => {
    setNote(null);
    try {
      setNote(`Saved ${await exportDebugReport(tab)}`);
    } catch (cause) {
      void recordError("popup", cause);
      setNote("Could not create the report.");
    }
  };

  return (
    <LabeledRow label="Diagnostics" stacked>
      <Stack gap={8}>
        <Group>
          <Button
            size="compact-sm"
            variant="default"
            leftSection={<IconBug size={14} />}
            onClick={() => void exportReport()}
            data-testid="popup-debug-report"
          >
            Export debug report
          </Button>
        </Group>
        {note && (
          <StatusNote tone="muted" testId="popup-debug-note">
            {note}
          </StatusNote>
        )}
      </Stack>
    </LabeledRow>
  );
}

export function PopupApp() {
  const [tab, setTab] = useState<TargetTab | null>(null);
  const [stats, setStats] = useState<PageStats | null | "loading">("loading");

  useEffect(() => {
    let active = true;
    void (async () => {
      const found = await findTargetTab();
      if (!active) return;
      setTab(found);
      if (found === null) return setStats(null);
      try {
        const result = await sendMessage("getPageStats", undefined, found.id);
        if (active) setStats(result);
      } catch {
        if (active) setStats(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const canFilter = tab !== null && ["category", "search"].includes(parseIdealoUrl(tab.url).kind);
  const openFilterBuilder = async (): Promise<void> => {
    if (tab === null) return;
    try {
      await sendMessage("openFilterBuilder", undefined, tab.id);
      await activateTab(tab.id);
      window.close();
    } catch {
      setStats(null);
    }
  };

  return (
    <Stack gap="md" p="md" data-testid="popup">
      <Text fz="lg" fw={600}>
        idealo Hardware Rating
      </Text>
      <BenchmarkRow />
      <LabeledRow label="This page">
        <Text fz="sm" data-testid="popup-page">
          {pageSummary(tab, stats)}
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
        Open filter builder
      </Button>
      <OpenRouterConnectedRow />
      <CaptureConnectedRow tab={tab} />
      <Diagnostics tab={tab} />
      <Anchor
        component="button"
        type="button"
        fz="sm"
        ta="left"
        onClick={openOptions}
        data-testid="popup-settings"
      >
        Settings
      </Anchor>
    </Stack>
  );
}
