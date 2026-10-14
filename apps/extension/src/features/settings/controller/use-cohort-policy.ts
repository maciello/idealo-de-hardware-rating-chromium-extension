import { type CohortPolicy, DEFAULT_COHORT_POLICY } from "@idealo-hw/hw-bench";
import { cohortPolicyItem } from "../../../platform/storage";
import { useStorageItem } from "../../../platform/storage/use-storage-item";
import { type CutoffKind, isValidCohortPolicy, readCohortPolicy, withCutoffKind } from "../model";

export interface CohortPolicyModel {
  policy: CohortPolicy;
  setCutoffKind(kind: CutoffKind): void;
  /** Saves `next` only when it is a valid policy. */
  update(next: CohortPolicy): void;
}

/** The percentile cohort policy, persisted in the cohort policy item. */
export function useCohortPolicy(): CohortPolicyModel {
  const [stored, save] = useStorageItem(cohortPolicyItem);
  const policy = readCohortPolicy(stored, DEFAULT_COHORT_POLICY);
  return {
    policy,
    setCutoffKind: (kind) => save(withCutoffKind(policy, kind)),
    update: (next) => {
      if (isValidCohortPolicy(next)) save(next);
    },
  };
}
