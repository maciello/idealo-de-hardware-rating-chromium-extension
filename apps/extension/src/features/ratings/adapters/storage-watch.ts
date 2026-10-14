import {
  cohortPolicyItem,
  cpuSnapshotItem,
  gpuSnapshotItem,
  settingsItem,
} from "../../../platform/storage";

/** Calls `onChange` when anything a rating depends on changes; returns the function that stops it. */
export function watchRatingInputs(onChange: () => void): () => void {
  const unwatch = [
    cpuSnapshotItem.watch(onChange),
    gpuSnapshotItem.watch(onChange),
    settingsItem.watch(onChange),
    cohortPolicyItem.watch(onChange),
  ];
  return () => {
    for (const stop of unwatch) stop();
  };
}
