import type { FormFactor } from "@idealo-hw/hw-bench";
import type { ModelScorer } from "@idealo-hw/idealo-query";
import { loadCpuSnapshot, loadGpuSnapshot } from "../../../platform/storage";
import { createModelScorer } from "../model";

export interface ScorerSource {
  scorer: ModelScorer;
  /** Which PassMark exports are imported. */
  hasData: { cpu: boolean; gpu: boolean };
}

/** Reads the imported PassMark snapshots and scores models as the page's device class. */
export async function loadScorerSource(formFactor: FormFactor): Promise<ScorerSource> {
  const [cpu, gpu] = await Promise.all([loadCpuSnapshot(), loadGpuSnapshot()]);
  return {
    scorer: createModelScorer(cpu, gpu, formFactor),
    hasData: { cpu: cpu !== null, gpu: gpu !== null },
  };
}
