import { type CohortPolicy, CohortPolicySchema, DEFAULT_COHORT_POLICY } from "@idealo-hw/hw-bench";
import { storage } from "@wxt-dev/storage";
import { type Settings, SettingsSchema } from "../../../contracts";

/** `null` until the user saves settings; consumers resolve it against the strategy catalog. */
export const settingsItem = storage.defineItem<Settings | null>("local:settings", {
  fallback: null,
  version: 1,
});

/** Which CPUs form the reference distribution of the segment percentile. */
export const cohortPolicyItem = storage.defineItem<CohortPolicy>("local:cohortPolicy", {
  fallback: DEFAULT_COHORT_POLICY,
  version: 1,
});

/** Stored settings re-validated on read; null when never saved or unreadable. */
export async function loadSettings(): Promise<Settings | null> {
  const parsed = SettingsSchema.safeParse(await settingsItem.getValue());
  return parsed.success ? parsed.data : null;
}

/** Stored cohort policy re-validated on read; the default when unreadable. */
export async function loadCohortPolicy(): Promise<CohortPolicy> {
  const parsed = CohortPolicySchema.safeParse(await cohortPolicyItem.getValue());
  return parsed.success ? parsed.data : DEFAULT_COHORT_POLICY;
}
