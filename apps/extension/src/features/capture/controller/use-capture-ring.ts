import { useEffect, useState } from "react";
import { downloadJson } from "../../../platform/download";
import { captureModeItem } from "../../../platform/storage";
import { useStorageItem } from "../../../platform/storage/use-storage-item";
import { captureRing } from "../adapters/ring";

export interface CaptureRingModel {
  enabled: boolean;
  setEnabled(enabled: boolean): void;
  /** Responses currently held in the ring. */
  count: number;
  exportAll(): void;
  clear(): void;
}

/** Capture mode switch plus the ring buffer's size, export and clear, shared by popup and options. */
export function useCaptureRing(): CaptureRingModel {
  const [stored, setEnabled] = useStorageItem(captureModeItem);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = (): void => void captureRing.count().then(setCount);
    refresh();
    return captureRing.watch(refresh);
  }, []);

  const exportAll = async (): Promise<void> => {
    const captures = await captureRing.list();
    downloadJson("captures", { captures });
  };

  return {
    enabled: stored ?? false,
    setEnabled,
    count,
    exportAll: () => void exportAll(),
    clear: () => void captureRing.clear(),
  };
}
