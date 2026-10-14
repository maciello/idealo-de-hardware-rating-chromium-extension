import { useState } from "react";
import { NOT_CONNECTED, type OpenRouterStatus, OpenRouterStatusSchema } from "../../../contracts";
import { type ErrorSource, recordError } from "../../../platform/errors";
import { sendMessage } from "../../../platform/messaging";
import { openrouterStatusItem } from "../../../platform/storage";
import { useStorageItem } from "../../../platform/storage/use-storage-item";
import { formatLocalDateTime } from "../../../ui";
import { AI_COPY } from "../copy";

export interface OpenRouterConnection {
  status: OpenRouterStatus;
  /** "Account <id>, connected <date>" while connected. */
  details: string | null;
  connecting: boolean;
  disconnecting: boolean;
  testing: boolean;
  error: string | null;
  connect(): void;
  disconnect(): void;
  runTest(): void;
}

/**
 * Connection state and actions shared by the popup row and the options card. The key itself never
 * reaches this code: the background owns it and reports only the status.
 */
export function useOpenRouterConnection(source: ErrorSource): OpenRouterConnection {
  const [stored] = useStorageItem(openrouterStatusItem);
  const parsed = OpenRouterStatusSchema.safeParse(stored);
  const status = parsed.success ? parsed.data : NOT_CONNECTED;
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attempt = async (
    setBusy: (busy: boolean) => void,
    task: () => Promise<void>,
  ): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (cause) {
      void recordError(source, cause);
      setError(AI_COPY.backgroundSilent);
    } finally {
      setBusy(false);
    }
  };

  const connect = () =>
    attempt(setConnecting, async () => {
      const result = await sendMessage("connectOpenRouter", undefined);
      if (!result.ok) setError(result.error.message);
    });
  const disconnect = () =>
    attempt(setDisconnecting, async () => {
      await sendMessage("disconnectOpenRouter", undefined);
    });
  const runTest = () =>
    attempt(setTesting, async () => {
      await sendMessage("testAiMatching", undefined);
    });

  return {
    status,
    details: status.connected
      ? AI_COPY.details(
          status.userId,
          status.obtainedAt ? formatLocalDateTime(status.obtainedAt) : "",
        )
      : null,
    connecting,
    disconnecting,
    testing,
    error,
    connect: () => void connect(),
    disconnect: () => void disconnect(),
    runTest: () => void runTest(),
  };
}
