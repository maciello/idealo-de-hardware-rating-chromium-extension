import type { GpuBenchmarkRecord } from "../../benchmark";
import {
  extractGpuIdentity,
  looseGpuNameKey,
  normalizeGpuName,
  splitCombinedModelName,
} from "../identity";
import { formOf } from "./form";
import type { Entry, Group } from "./types";

/** The lookup tables a matcher reads; built once per snapshot. */
export interface GpuTables {
  /** Groups of models whose records state a memory size, keyed "<identity key>-<n>gb". */
  readonly withMemory: ReadonlyMap<string, Group>;
  /** Memory-qualified groups of a model, for texts that give no memory ("RTX 5060 Ti" -> its 8GB and 16GB cards). */
  readonly memoryVariants: ReadonlyMap<string, readonly Group[]>;
  /** Groups of models whose records state no memory size, keyed by identity key. */
  readonly base: ReadonlyMap<string, Group>;
  readonly byName: ReadonlyMap<string, readonly GpuBenchmarkRecord[]>;
  /** Same records under `looseGpuNameKey`; only read when `byName` has nothing. */
  readonly byLooseName: ReadonlyMap<string, readonly GpuBenchmarkRecord[]>;
}

const groupFor = (map: Map<string, Group>, key: string): Group => {
  const existing = map.get(key);
  if (existing !== undefined) return existing;
  const created: Group = { entries: [] };
  map.set(key, created);
  return created;
};

/**
 * Records are grouped by identity key (model without "Laptop GPU", "(Mobile)", "with Max-Q Design"); every record
 * in a group is a laptop, desktop or neutral one. Only names that are exactly one recognised model join a group;
 * "RTX 3050 OEM" stays reachable by name only.
 */
export function buildGpuTables(records: readonly GpuBenchmarkRecord[]): GpuTables {
  const withMemory = new Map<string, Group>();
  const memoryVariants = new Map<string, Group[]>();
  const base = new Map<string, Group>();
  const byName = new Map<string, GpuBenchmarkRecord[]>();
  const byLooseName = new Map<string, GpuBenchmarkRecord[]>();

  for (const record of records) {
    const nameKey = normalizeGpuName(record.name);
    byName.set(nameKey, [...(byName.get(nameKey) ?? []), record]);
    const looseKey = looseGpuNameKey(record.name);
    byLooseName.set(looseKey, [...(byLooseName.get(looseKey) ?? []), record]);

    const modelNames = splitCombinedModelName(record.name);
    for (const modelName of modelNames) {
      const identity = extractGpuIdentity(modelName);
      if (identity === null || identity.residual !== "") continue;
      const entry: Entry = {
        record,
        maxQ: identity.maxQ,
        form: formOf(record, identity),
        combined: modelNames.length > 1,
      };
      const target =
        identity.memoryGb === null
          ? groupFor(base, identity.key)
          : groupFor(withMemory, `${identity.key}-${identity.memoryGb}gb`);
      if (identity.memoryGb !== null) {
        const variants = memoryVariants.get(identity.key) ?? [];
        if (!variants.includes(target)) memoryVariants.set(identity.key, [...variants, target]);
      }
      target.entries.push(entry);
    }
  }
  return { withMemory, memoryVariants, base, byName, byLooseName };
}
