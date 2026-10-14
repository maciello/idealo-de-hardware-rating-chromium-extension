import { defineExtensionMessaging } from "@webext-core/messaging";
import type { ConnectResult } from "./ai/openrouter-connect";

interface ProtocolMap {
  /** Content scripts cannot call `runtime.openOptionsPage`; the background does it for them. */
  openOptions(): void;
  /** Options page -> background: run the OpenRouter OAuth PKCE flow. The result never carries the key. */
  connectOpenRouter(): ConnectResult;
  /** Options page -> background: delete the stored OpenRouter key locally. */
  disconnectOpenRouter(): void;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
