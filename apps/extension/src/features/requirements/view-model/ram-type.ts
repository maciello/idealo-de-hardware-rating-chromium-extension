import type { FacetPlan } from "@idealo-hw/idealo-query";
import { FALLBACK_RAM_TYPES } from "../config";
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

const generation = (label: string): number => Number(/\d+/.exec(label)?.[0] ?? 0);

/** Newest generation first, plain before low-power within one. */
const byGeneration = (a: string, b: string): number =>
  generation(b) - generation(a) || a.localeCompare(b);

/** `listed` are the labels of the category's RAM-type group; empty when it has none. */
export function ramTypeModel(
  listed: readonly string[],
  selected: readonly string[],
  plan: FacetPlan | undefined,
): RamTypeModel {
  const available = listed.length > 0;
  return {
    available,
    labels: [...(available ? listed : FALLBACK_RAM_TYPES)].sort(byGeneration),
    selected: available ? [...selected] : [],
    note: available ? statusLine(plan) : REQUIREMENTS_COPY.ramType.unavailable,
  };
}
