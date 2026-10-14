import { defineExtensionMessaging } from "@webext-core/messaging";
import type { ProtocolMap } from "../../contracts";

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
