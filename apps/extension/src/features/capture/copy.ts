import { MAX_SNAPSHOT_BYTES } from "../../page/snapshot";
import { RING_CAPACITY } from "./config";

const SNAPSHOT_LIMIT_MB = MAX_SNAPSHOT_BYTES / (1024 * 1024);

export const CAPTURE_COPY = {
  // Options card
  cardTitle: "Network capture",
  description: `Records the url, method and status of idealo requests (newest ${RING_CAPACITY}), plus the body of their JSON responses, so filter and spec adapters can be written from real data. Requests to other hosts are not recorded. Nothing is sent anywhere.`,
  captureMode: "Capture mode",
  captured: (count: number) => `${count} captured`,
  exportResponses: "Export captured responses",
  clear: "Clear",

  // Popup row
  rowLabel: "Capture",
  record: "Record requests",
  recordCount: (count: string) => `Record requests (${count})`,
  export: "Export",
  saveSnapshot: "Save page snapshot",
  snapshotSaved: (megabytes: string, truncated: boolean) =>
    `Snapshot saved (${megabytes} MB${truncated ? `, cut at ${SNAPSHOT_LIMIT_MB} MB` : ""})`,
  snapshotFailed: "Could not read this page. Reload it and try again.",
} as const;
