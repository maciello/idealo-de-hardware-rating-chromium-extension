import { defineExtensionMessaging } from "@webext-core/messaging";

interface ProtocolMap {
  /** Content scripts cannot call `runtime.openOptionsPage`; the background does it for them. */
  openOptions(): void;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
