import {
  loadCohortPolicy,
  loadCpuSnapshot,
  loadGpuSnapshot,
  loadSettings,
} from "../../../platform/storage";
import {
  createGpuEngine,
  createRatingEngine,
  DEFAULT_PRIMARY_ID,
  type RatingView,
  resolveEnabledStrategyIds,
} from "../model";

/** Reads the imported benchmarks and the user's settings from storage and builds the engines. */
export async function loadRatingView(): Promise<RatingView> {
  const [snapshot, gpuSnapshot, settings, cohortPolicy] = await Promise.all([
    loadCpuSnapshot(),
    loadGpuSnapshot(),
    loadSettings(),
    loadCohortPolicy(),
  ]);
  return {
    engine:
      snapshot === null
        ? null
        : createRatingEngine(
            snapshot,
            resolveEnabledStrategyIds(settings?.enabledStrategyIds),
            cohortPolicy,
          ),
    gpuEngine: gpuSnapshot === null ? null : createGpuEngine(gpuSnapshot, cohortPolicy),
    primaryId: settings?.primaryStrategyId ?? DEFAULT_PRIMARY_ID,
    importedAt: snapshot?.importedAt ?? gpuSnapshot?.importedAt ?? null,
  };
}
