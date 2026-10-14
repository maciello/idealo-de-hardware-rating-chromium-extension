import type { TargetTab } from "../../platform/tabs";
import { formatInteger } from "../../ui";
import { useCaptureRing } from "./controller/use-capture-ring";
import { useSnapshotSaver } from "./controller/use-snapshot-saver";
import { CAPTURE_COPY } from "./copy";
import { CaptureCard } from "./view/CaptureCard";
import { CaptureRow } from "./view/CaptureRow";

/** Options-page card: capture mode, count, export and clear. */
export function CaptureConnectedCard() {
  const ring = useCaptureRing();
  return (
    <CaptureCard
      enabled={ring.enabled}
      count={ring.count}
      onToggle={ring.setEnabled}
      onExport={ring.exportAll}
      onClear={ring.clear}
    />
  );
}

/** Popup row: capture mode, export and a page snapshot of the idealo tab. */
export function CaptureConnectedRow({ tab }: { tab: TargetTab | null }) {
  const ring = useCaptureRing();
  const snapshot = useSnapshotSaver(tab);
  return (
    <CaptureRow
      enabled={ring.enabled}
      switchLabel={
        ring.count > 0 ? CAPTURE_COPY.recordCount(formatInteger(ring.count)) : CAPTURE_COPY.record
      }
      canExport={ring.count > 0}
      canSnapshot={snapshot.canSave}
      note={snapshot.note}
      onToggle={ring.setEnabled}
      onExport={ring.exportAll}
      onSnapshot={snapshot.save}
    />
  );
}
