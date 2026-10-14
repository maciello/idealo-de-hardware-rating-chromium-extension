import { parseIdealoUrl } from "@idealo-hw/idealo-query";
import { Anchor, Button, Group, SegmentedControl, Stack, Switch, Text } from "@mantine/core";
import { IconAdjustmentsHorizontal, IconDownload, IconFileExport } from "@tabler/icons-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { captureRing } from "../capture/ring";
import { type PageStats, sendMessage } from "../messaging";
import { useStorageItem } from "../options/use-storage-item";
import { resolveEnabledStrategyIds } from "../ratings/engine";
import { DEFAULT_PRIMARY_ID, formatInteger, PRIMARY_CHOICES } from "../ratings/present";
import { captureModeItem, cpuSnapshotItem, gpuSnapshotItem, settingsItem } from "../storage/items";
import {
  NOT_CONNECTED,
  OpenRouterStatusSchema,
  openrouterStatusItem,
} from "../storage/openrouter-status";
import { CpuSnapshotSchema, GpuSnapshotSchema, SettingsSchema } from "../storage/schemas";
import { downloadJson } from "../ui/download";
import { findTargetTab, type TargetTab } from "./target-tab";

const SHORT_DATE = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

const shortDate = (iso: string | null | undefined): string | null => {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(time) ? null : SHORT_DATE.format(new Date(time));
};

/** Label left for short content; `stacked` puts the label above, for content that needs the width. */
function Row({
  label,
  stacked = false,
  children,
}: {
  label: string;
  stacked?: boolean;
  children: ReactNode;
}) {
  if (stacked) {
    return (
      <Stack gap={6}>
        <Text fz="xs" c="var(--hw-ink-muted)">
          {label}
        </Text>
        {children}
      </Stack>
    );
  }
  return (
    <Group wrap="nowrap" align="flex-start" gap="sm">
      <Text fz="xs" c="var(--hw-ink-muted)" w={104} pt={2} style={{ flex: "none" }}>
        {label}
      </Text>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </Group>
  );
}

const openOptions = (): void => void browser.runtime.openOptionsPage();

function useRecord<T>(
  value: unknown,
  schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } },
): T | null {
  return useMemo(() => {
    const parsed = schema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }, [value, schema]);
}

function BenchmarkData() {
  const [cpuRaw] = useStorageItem(cpuSnapshotItem);
  const [gpuRaw] = useStorageItem(gpuSnapshotItem);
  const cpu = useRecord(cpuRaw, CpuSnapshotSchema);
  const gpu = useRecord(gpuRaw, GpuSnapshotSchema);
  const imported = shortDate(cpu?.importedAt ?? gpu?.importedAt);
  const parts = [
    cpu ? `CPU ${formatInteger(cpu.records.length)}` : null,
    gpu ? `GPU ${formatInteger(gpu.records.length)}` : null,
  ].filter((part) => part !== null);
  return (
    <Row label="Benchmark data">
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text fz="sm" data-testid="popup-data">
          {parts.length === 0 ? "Nothing imported yet" : parts.join(" · ")}
          {parts.length > 0 && imported ? ` (imported ${imported})` : ""}
        </Text>
        <Button
          size="compact-sm"
          variant="default"
          onClick={openOptions}
          data-testid="popup-import"
        >
          Import
        </Button>
      </Group>
    </Row>
  );
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

function PrimaryNumber() {
  const [stored, save] = useStorageItem(settingsItem);
  const settings = useMemo(() => {
    const parsed = SettingsSchema.safeParse(stored);
    return parsed.success ? parsed.data : null;
  }, [stored]);
  return (
    <Row label="Primary number" stacked>
      <SegmentedControl
        fullWidth
        size="xs"
        data={PRIMARY_CHOICES.map((c) => ({ value: c.id, label: c.label }))}
        value={settings?.primaryStrategyId ?? DEFAULT_PRIMARY_ID}
        onChange={(primaryStrategyId) =>
          save({
            ...settings,
            enabledStrategyIds: resolveEnabledStrategyIds(settings?.enabledStrategyIds),
            primaryStrategyId,
          })
        }
        data-testid="popup-primary"
      />
    </Row>
  );
}

function AiMatching() {
  const [stored] = useStorageItem(openrouterStatusItem);
  const parsed = OpenRouterStatusSchema.safeParse(stored);
  const status = parsed.success ? parsed.data : NOT_CONNECTED;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: "connect" | "disconnect"): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      if (action === "connect") {
        const result = await sendMessage("connectOpenRouter", undefined);
        if (!result.ok) setError(result.error.message);
      } else {
        await sendMessage("disconnectOpenRouter", undefined);
      }
    } catch {
      setError("The extension background did not respond. Reload the extension and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Row label="AI matching" stacked>
      <Group justify="space-between" wrap="nowrap" gap="xs">
        {status.connected ? (
          <>
            <Text fz="sm" data-testid="popup-ai">
              Connected
            </Text>
            <Button
              size="compact-sm"
              variant="default"
              loading={busy}
              onClick={() => void run("disconnect")}
            >
              Disconnect
            </Button>
          </>
        ) : (
          <>
            <Text fz="sm" c="var(--hw-ink-muted)" data-testid="popup-ai">
              Not connected
            </Text>
            <Button
              size="compact-sm"
              loading={busy}
              onClick={() => void run("connect")}
              data-testid="popup-connect"
            >
              Connect OpenRouter
            </Button>
          </>
        )}
      </Group>
      {error && (
        <Text fz="xs" c="red" mt={4} role="alert">
          {error}
        </Text>
      )}
    </Row>
  );
}

function Capture({ tab }: { tab: TargetTab | null }) {
  const [stored, setCaptureMode] = useStorageItem(captureModeItem);
  const [count, setCount] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const refresh = (): void => void captureRing.count().then(setCount);
    refresh();
    return captureRing.watch(refresh);
  }, []);

  const exportCaptures = async (): Promise<void> => {
    const captures = await captureRing.list();
    downloadJson("captures", { captures });
  };

  const saveSnapshot = async (): Promise<void> => {
    if (tab === null) return;
    setNote(null);
    try {
      const snapshot = await sendMessage("getPageSnapshot", undefined, tab.id);
      downloadJson("page-snapshot", { ...snapshot });
      const mb = (snapshot.html.length / 1_000_000).toLocaleString("de-DE", {
        maximumFractionDigits: 1,
      });
      setNote(`Snapshot saved (${mb} MB${snapshot.truncated ? ", cut at 5 MB" : ""})`);
    } catch {
      setNote("Could not read this page. Reload it and try again.");
    }
  };

  return (
    <Row label="Capture" stacked>
      <Stack gap={8}>
        <Group justify="space-between" wrap="nowrap">
          <Switch
            size="sm"
            label={count > 0 ? `Record requests (${formatInteger(count)})` : "Record requests"}
            checked={stored ?? false}
            onChange={(event) => setCaptureMode(event.currentTarget.checked)}
            data-testid="popup-capture"
          />
        </Group>
        <Group gap="xs" wrap="nowrap" grow>
          <Button
            size="compact-sm"
            variant="default"
            leftSection={<IconFileExport size={14} />}
            disabled={count === 0}
            onClick={() => void exportCaptures()}
            data-testid="popup-export"
          >
            Export
          </Button>
          <Button
            size="compact-sm"
            variant="default"
            leftSection={<IconDownload size={14} />}
            disabled={tab === null}
            onClick={() => void saveSnapshot()}
            data-testid="popup-snapshot"
          >
            Save page snapshot
          </Button>
        </Group>
        {note && (
          <Text fz="xs" c="var(--hw-ink-muted)" role="status" data-testid="popup-note">
            {note}
          </Text>
        )}
      </Stack>
    </Row>
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
      await browser.tabs.update(tab.id, { active: true });
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
      <BenchmarkData />
      <Row label="This page">
        <Text fz="sm" data-testid="popup-page">
          {pageSummary(tab, stats)}
        </Text>
      </Row>
      <PrimaryNumber />
      <Button
        variant="default"
        leftSection={<IconAdjustmentsHorizontal size={16} />}
        disabled={!canFilter}
        onClick={() => void openFilterBuilder()}
        data-testid="popup-filter"
      >
        Open filter builder
      </Button>
      <AiMatching />
      <Capture tab={tab} />
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
