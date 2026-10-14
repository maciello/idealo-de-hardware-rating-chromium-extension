import { type ErrorSource, recordError } from "../../../platform/errors";

export interface ScanLoop {
  /** Runs the scan now; a call while one is running makes it run once more afterwards. */
  refresh(): Promise<void>;
  /** Runs the scan after `delay` ms, replacing any pending run. */
  schedule(delay: number): void;
  stop(): void;
}

/** Where a failing scan is reported; production uses the persistent error log. */
export type ErrorRecorder = (where: ErrorSource, error: unknown) => Promise<void>;

/** Serialises scans so overlapping triggers coalesce, and reports a failing scan instead of throwing. */
export function createScanLoop(
  scan: () => Promise<void>,
  record: ErrorRecorder = recordError,
): ScanLoop {
  let running = false;
  let rerun = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const refresh = async (): Promise<void> => {
    if (running) {
      rerun = true;
      return;
    }
    running = true;
    try {
      do {
        rerun = false;
        await scan();
      } while (rerun);
    } catch (error) {
      await record("content", error);
    } finally {
      running = false;
    }
  };

  return {
    refresh,
    schedule(delay) {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), delay);
    },
    stop: () => clearTimeout(timer),
  };
}
