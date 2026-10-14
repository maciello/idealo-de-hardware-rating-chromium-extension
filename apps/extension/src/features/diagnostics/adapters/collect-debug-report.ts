import { type PageReport, PageReportSchema } from "../../../contracts";
import { readErrorLog } from "../../../platform/errors";
import { sendMessage } from "../../../platform/messaging";
import { readRuntimeInfo } from "../../../platform/runtime";
import {
  captureModeItem,
  loadAiTestResult,
  loadCohortPolicy,
  loadCpuSnapshot,
  loadGpuSnapshot,
  loadOpenRouterStatus,
  loadSettings,
} from "../../../platform/storage";
import type { TargetTab } from "../../../platform/tabs";
import { resolveEnabledStrategyIds } from "../../ratings";
import { DIAGNOSTICS_COPY } from "../copy";
import { buildDebugReport, type DebugReport } from "../model";

/**
 * Asks the content script in a tab for its page report. Typed as the protocol declares it; the
 * collector still parses the answer, because the tab may run an older content script.
 */
export type PageReportAsker = (tabId: number) => Promise<PageReport>;

const askContentScript: PageReportAsker = (tabId) => sendMessage("getPageReport", undefined, tabId);

async function readPage(
  tab: TargetTab | null,
  ask: PageReportAsker,
): Promise<{ page: PageReport | null; pageNote: string | null }> {
  if (tab === null) return { page: null, pageNote: DIAGNOSTICS_COPY.noTab };
  try {
    const parsed = PageReportSchema.safeParse(await ask(tab.id));
    return parsed.success
      ? { page: parsed.data, pageNote: null }
      : { page: null, pageNote: DIAGNOSTICS_COPY.unreadableReport };
  } catch {
    return { page: null, pageNote: DIAGNOSTICS_COPY.noAnswer };
  }
}

/** Reads the allowlisted inputs of the debug report. Deliberately never touches the OpenRouter key store. */
export async function collectDebugReport(
  tab: TargetTab | null,
  ask: PageReportAsker = askContentScript,
): Promise<DebugReport> {
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
      readPage(tab, ask),
    ]);
  return buildDebugReport({
    ...readRuntimeInfo(),
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
