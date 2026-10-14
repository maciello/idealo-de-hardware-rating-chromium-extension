import type { GpuBenchmarkRecord } from "../../benchmark";
import type { FormFactor } from "../../identity";
import type { GpuIdentity } from "../identity";
import { collapseByExactName, isNegligible, narrowByMaxQ, preferSingleModel } from "./narrow";
import type { GpuTables } from "./tables";
import type { Entry, RecordForm } from "./types";

export interface Resolved {
  readonly records: GpuBenchmarkRecord[];
  /** The records are reported ambiguous even when there is only one. */
  readonly unsure: boolean;
}

/**
 * Lookup order: identity key with memory ("rtx-3050-6gb"), identity key. Never fuzzy.
 * A text without memory whose model only exists per memory size ("RTX 5060 Ti" -> 8GB, 16GB) yields all of them, so it is ambiguous.
 *
 * Variant policy per group (L = laptop records, D = desktop records, N = neutral ones: integrated graphics,
 * workstation and uncategorised cards). A record of the other form factor is never returned, not even as a candidate:
 * - laptop: L when it exists, else N, else nothing (no_match).
 * - desktop: D and N together, else nothing.
 * - unknown: everything that exists -> ambiguous when more than one record.
 * Memory: a size stated right behind the model picks the sized records. Without a size, a plain record is the model's
 * default; where PassMark lists the model only per size (or the plain record is statistical noise) all sizes are candidates.
 * A laptop (or laptop-only) result that consists solely of Max-Q records, for text that does not say Max-Q, is
 * reported ambiguous even with one candidate: it is the slower variant, so its score is a lower bound.
 */
export function resolveGroup(
  tables: GpuTables,
  query: string | GpuIdentity,
  identity: GpuIdentity,
  formFactor: FormFactor,
): Resolved | null {
  const memoryGroup =
    identity.memoryGb === null
      ? undefined
      : tables.withMemory.get(`${identity.key}-${identity.memoryGb}gb`);
  const baseGroup = tables.base.get(identity.key);
  const sizedGroups = tables.memoryVariants.get(identity.key) ?? [];
  if (memoryGroup === undefined && baseGroup === undefined && sizedGroups.length === 0) {
    return null;
  }
  const pick = (accept: (entry: Entry) => boolean): Entry[] => {
    const plain = preferSingleModel(baseGroup?.entries.filter(accept) ?? []);
    if (identity.memoryGb !== null) {
      const fromMemory = preferSingleModel(memoryGroup?.entries.filter(accept) ?? []);
      return fromMemory.length > 0 ? fromMemory : plain;
    }
    const sized = sizedGroups.flatMap((group) => preferSingleModel(group.entries.filter(accept)));
    return plain.length > 0 && !isNegligible(plain, sized)
      ? plain
      : sized.length > 0
        ? sized
        : plain;
  };
  const pickForm = (form: RecordForm): Entry[] => pick((entry) => entry.form === form);
  /** Everything usable in a desktop: desktop and neutral records, never a laptop one. */
  const pickDesktop = (): Entry[] => pick((entry) => entry.form !== "laptop");
  const found = (entries: readonly Entry[], unsure = false): Resolved => ({
    records: entries.map((e) => e.record),
    unsure,
  });

  const effective: FormFactor = identity.variant === "laptop" ? "laptop" : formFactor;
  if (effective === "unknown") {
    const mobile = pickForm("laptop");
    const laptop = collapseByExactName(narrowByMaxQ(mobile, identity.maxQ), query);
    const other = collapseByExactName(
      pick((entry) => entry.form !== "laptop"),
      query,
    );
    return found([...other, ...laptop]);
  }
  if (effective === "laptop") {
    const mobile = pickForm("laptop");
    if (mobile.length > 0) {
      // Text without "Max-Q" for a model PassMark only lists as Max-Q: the card may be the faster full-power one.
      const onlyMaxQ = !identity.maxQ && mobile.every((e) => e.maxQ);
      return found(collapseByExactName(narrowByMaxQ(mobile, identity.maxQ), query), onlyMaxQ);
    }
    return found(collapseByExactName(pickForm("neutral"), query));
  }
  return found(collapseByExactName(pickDesktop(), query));
}
