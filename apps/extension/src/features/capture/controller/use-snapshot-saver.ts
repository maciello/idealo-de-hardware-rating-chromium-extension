import { useState } from "react";
import { downloadJson } from "../../../platform/download";
import { recordError } from "../../../platform/errors";
import { sendMessage } from "../../../platform/messaging";
import type { TargetTab } from "../../../platform/tabs";
import { formatMegabytes } from "../../../ui";
import { CAPTURE_COPY } from "../copy";

export interface SnapshotSaver {
  /** Outcome of the last save; null before the first one. */
  note: string | null;
  canSave: boolean;
  save(): void;
}

/** Asks the idealo tab for a sanitized page snapshot and downloads it as JSON. */
export function useSnapshotSaver(tab: TargetTab | null): SnapshotSaver {
  const [note, setNote] = useState<string | null>(null);

  const save = async (): Promise<void> => {
    if (tab === null) return;
    setNote(null);
    try {
      const snapshot = await sendMessage("getPageSnapshot", undefined, tab.id);
      downloadJson("page-snapshot", { ...snapshot });
      const mb = formatMegabytes(snapshot.html.length);
      setNote(CAPTURE_COPY.snapshotSaved(mb, snapshot.truncated));
    } catch (cause) {
      void recordError("popup", cause);
      setNote(CAPTURE_COPY.snapshotFailed);
    }
  };

  return { note, canSave: tab !== null, save: () => void save() };
}
