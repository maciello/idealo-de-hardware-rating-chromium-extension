import type { PageKind, PageSnapshot } from "@idealo-hw/idealo-page";
import type { AiTestResult } from "./ai-test-result";
import type { ConnectResult } from "./oauth";
import type { PageReport } from "./page-report";

/** What the content script knows about the tab it runs in. */
export interface PageStats {
  kind: PageKind;
  /** Products that got a CPU rating. */
  rated: number;
  /** Products found on the page. */
  total: number;
}

export interface ProtocolMap {
  /** Content scripts cannot call `runtime.openOptionsPage`; the background does it for them. */
  openOptions(): void;
  /** Options page -> background: run the OpenRouter OAuth PKCE flow. The result never carries the key. */
  connectOpenRouter(): ConnectResult;
  /** Options page -> background: delete the stored OpenRouter key locally. */
  disconnectOpenRouter(): void;
  /**
   * Options page -> background: one real Jev decision on a fixed probe case. The result is also
   * stored (`aiTestResultItem`); it never carries the key.
   */
  testAiMatching(): AiTestResult;
  /** Popup -> content script (tabId): how many products on this page have a rating. */
  getPageStats(): PageStats;
  /** Popup -> content script (tabId): what was read on this page and what could be rated, for the debug report. */
  getPageReport(): PageReport;
  /** Popup -> content script (tabId): open the filter builder; false when this page has none. */
  openFilterBuilder(): boolean;
  /** Popup -> content script (tabId): sanitized copy of the page, for building real adapters. */
  getPageSnapshot(): PageSnapshot;
}
