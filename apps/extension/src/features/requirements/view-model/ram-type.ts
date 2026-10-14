import { compareRamLabels, KNOWN_RAM_TYPES } from "@idealo-hw/hw-bench";
import type { FacetPlan } from "@idealo-hw/idealo-query";
import { REQUIREMENTS_COPY } from "../copy";
import { statusLine } from "./status";

export interface RamTypeModel {
  /** False where the category has no RAM-type group; the chips are then shown disabled. */
  available: boolean;
  labels: string[];
  selected: string[];
  /** The plan's status line, or the note that there is no such filter. */
  note: string | null;
}

/** `listed` are the labels of the category's RAM-type group, empty when it has none (the known types are then shown disabled). */
export function ramTypeModel(
  listed: readonly string[],
  selected: readonly string[],
  plan: FacetPlan | undefined,
): RamTypeModel {
  const available = listed.length > 0;
  return {
    available,
    labels: [...(available ? listed : KNOWN_RAM_TYPES)].sort(compareRamLabels),
    selected: available ? [...selected] : [],
    note: available ? statusLine(plan) : REQUIREMENTS_COPY.ramType.unavailable,
  };
}
