import { type ErrorSource, recordError } from "./error-log";

const EXTENSION_ORIGIN = "chrome-extension://";

/**
 * Logs uncaught errors and unhandled rejections of this context. A content script shares the page's
 * window object but only sees events from its own world; the extension-url check keeps anything that
 * is not ours out regardless.
 */
export function installGlobalErrorReporting(
  where: ErrorSource,
  target: EventTarget = globalThis,
): void {
  const ours = (...traces: (string | undefined)[]): boolean =>
    where !== "content" || traces.some((trace) => trace?.includes(EXTENSION_ORIGIN));
  target.addEventListener("error", (event) => {
    const { error, message, filename } = event as ErrorEvent;
    if (ours(filename, error instanceof Error ? error.stack : undefined)) {
      void recordError(where, error ?? message);
    }
  });
  target.addEventListener("unhandledrejection", (event) => {
    const { reason } = event as PromiseRejectionEvent;
    if (ours(reason instanceof Error ? reason.stack : undefined)) void recordError(where, reason);
  });
}
