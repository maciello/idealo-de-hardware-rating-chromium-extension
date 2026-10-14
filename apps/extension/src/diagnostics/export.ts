import { type PageReport, PageReportSchema } from "../contracts";
import { downloadJson } from "../platform/download";
import { readErrorLog } from "../platform/errors";
import { sendMessage } from "../platform/messaging";
import {
  captureModeItem,
  loadAiTestResult,
  loadCohortPolicy,
  loadCpuSnapshot,
  loadGpuSnapshot,
  loadOpenRouterStatus,
  loadSettings,
} from "../platform/storage";
import type { TargetTab } from "../platform/tabs";
import { resolveEnabledStrategyIds } from "../ratings/engine";
import { buildDebugReport, type DebugReport } from "./debug-report";

async function readPage(
  tab: TargetTab | null,
): Promise<{ page: PageReport | null; pageNote: string | null }> {
  if (tab === null) return { page: null, pageNote: "No idealo tab was open." };
  try {
    const parsed = PageReportSchema.safeParse(
      await sendMessage("getPageReport", undefined, tab.id),
    );
    return parsed.success
      ? { page: parsed.data, pageNote: null }
      : { page: null, pageNote: "The page answered with an unreadable report." };
  } catch {
    return { page: null, pageNote: "The idealo tab did not answer; reload it and try again." };
  }
}

/** Reads the allowlisted inputs of the debug report. Deliberately never touches the OpenRouter key store. */
export async function collectDebugReport(tab: TargetTab | null): Promise<DebugReport> {
  const [settings, cohortPolicy, captureMode, openrouter, aiTest, cpu, gpu, errors, page] =
    await Promise.all([
      loadSettings(),
      loadCohortPolicy(),
      captureModeItem.getValue(),
      loadOpenRouterStatus(),
      loadAiTestResult(),
      loadCpuSnapshot(),
      loadGpuSnapshot(),
      readErrorLog(),
      readPage(tab),
    ]);
  return buildDebugReport({
    extensionVersion: browser.runtime.getManifest().version,
    userAgent: navigator.userAgent,
    enabledStrategyIds: resolveEnabledStrategyIds(settings?.enabledStrategyIds),
    settings,
    cohortPolicy,
    captureMode,
    openrouter,
    aiTest,
    cpu,
    gpu,
    errors,
    ...page,
  });
}

/** Saves the debug report through the shared export path; returns the file name. */
export async function exportDebugReport(tab: TargetTab | null): Promise<string> {
  return downloadJson("debug-report", { ...(await collectDebugReport(tab)) });
}
