import { defineExtensionMessaging } from "@webext-core/messaging";
import type { ConnectResult } from "./ai/openrouter-connect";
import type { PageKind } from "./page/adapter";
import type { PageSnapshot } from "./page/snapshot";

/** What the content script knows about the tab it runs in. */
export interface PageStats {
  kind: PageKind;
  /** Products that got a CPU rating. */
  rated: number;
  /** Products found on the page. */
  total: number;
}

interface ProtocolMap {
  /** Content scripts cannot call `runtime.openOptionsPage`; the background does it for them. */
  openOptions(): void;
  /** Options page -> background: run the OpenRouter OAuth PKCE flow. The result never carries the key. */
  connectOpenRouter(): ConnectResult;
  /** Options page -> background: delete the stored OpenRouter key locally. */
  disconnectOpenRouter(): void;
  /** Popup -> content script (tabId): how many products on this page have a rating. */
  getPageStats(): PageStats;
  /** Popup -> content script (tabId): open the filter builder; false when this page has none. */
  openFilterBuilder(): boolean;
  /** Popup -> content script (tabId): sanitized copy of the page, for building real adapters. */
  getPageSnapshot(): PageSnapshot;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
