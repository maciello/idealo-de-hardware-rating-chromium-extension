import type { GpuBenchmarkRecord } from "../benchmark/records";
import type { BenchmarkSnapshot } from "../benchmark/snapshot";
import type { FormFactor } from "../identity/form-factor";
import type { MatchResult } from "../matcher/matcher";
import { extractGpuIdentity, type GpuIdentity, normalizeGpuName } from "./identity";

export interface GpuMatchOptions {
  /** Where the product is used; defaults to "unknown". Text that says "Laptop GPU" overrides it. */
  readonly formFactor?: FormFactor;
}

/** Port: maps GPU text to a PassMark record, taking the product's form factor into account. */
export interface GpuMatcher {
  match(query: string | GpuIdentity, options?: GpuMatchOptions): MatchResult<GpuBenchmarkRecord>;
}

interface Entry {
  readonly record: GpuBenchmarkRecord;
  readonly maxQ: boolean;
}

interface Group {
  readonly laptop: Entry[];
  readonly desktop: Entry[];
}

const byNameThenId = (a: GpuBenchmarkRecord, b: GpuBenchmarkRecord): number =>
  a.name.localeCompare(b.name) || a.id - b.id;

/** A record is the laptop variant when its name says so, or PassMark files it under Mobile only. */
function isLaptopRecord(record: GpuBenchmarkRecord, identity: GpuIdentity): boolean {
  if (identity.variant === "laptop") return true;
  return record.segments.includes("mobile") && !record.segments.includes("desktop");
}

const groupFor = (map: Map<string, Group>, key: string): Group => {
  const existing = map.get(key);
  if (existing !== undefined) return existing;
  const created: Group = { laptop: [], desktop: [] };
  map.set(key, created);
  return created;
};

const asResult = (
  records: readonly GpuBenchmarkRecord[],
  query: string | GpuIdentity,
  unsure = false,
): MatchResult<GpuBenchmarkRecord> => {
  const [only] = records;
  if (records.length === 0) return { status: "no_match" };
  if (records.length === 1 && only !== undefined && !unsure) {
    const exact = typeof query === "string" && only.name.trim() === query.trim();
    return { status: "matched", record: only, via: exact ? "exact" : "normalized" };
  }
  return { status: "ambiguous", candidates: [...records].sort(byNameThenId) };
};

/** Max-Q is a power variant: say it and get it; do not say it and get the plain mobile record when there is one. */
function narrowByMaxQ(entries: readonly Entry[], maxQ: boolean): Entry[] {
  const preferred = entries.filter((e) => e.maxQ === maxQ);
  return preferred.length > 0 ? preferred : [...entries];
}

/** PassMark lists some GPUs twice ("Intel UHD 770", "Intel UHD Graphics 770"); an exact name settles it. */
function collapseByExactName(entries: readonly Entry[], query: string | GpuIdentity): Entry[] {
  if (typeof query !== "string" || entries.length < 2) return [...entries];
  const exact = entries.filter((e) => e.record.name.trim() === query.trim());
  return exact.length === 1 ? exact : [...entries];
}

/**
 * Builds the lookup tables once. Records are grouped by identity key (model without "Laptop GPU",
 * "(Mobile)", "with Max-Q Design"); a group splits into laptop and desktop variants. Lookup order:
 * identity key with memory ("rtx-3050-6gb"), identity key, then the whole normalized name. Never fuzzy.
 * A text without memory whose model only exists per memory size ("RTX 5060 Ti" -> 8GB, 16GB) yields all of them, so it is ambiguous.
 *
 * Variant policy per group (L = laptop records, D = other records):
 * - laptop: L when it exists, else D (desktop-only GPUs such as integrated "Radeon 8060S" are kept).
 * - desktop: D when it exists, else L.
 * - unknown: both exist -> ambiguous with both; otherwise the one that exists.
 * A laptop (or laptop-only) result that consists solely of Max-Q records, for text that does not say Max-Q, is
 * reported ambiguous even with one candidate: it is the slower variant, so its score is a lower bound.
 */
export function createGpuMatcher(snapshot: BenchmarkSnapshot<GpuBenchmarkRecord>): GpuMatcher {
  const withMemory = new Map<string, Group>();
  /** Memory-qualified groups of a model, for texts that give no memory ("RTX 5060 Ti" -> its 8GB and 16GB cards). */
  const memoryVariants = new Map<string, Group[]>();
  const base = new Map<string, Group>();
  const byName = new Map<string, GpuBenchmarkRecord[]>();

  for (const record of snapshot.records) {
    const nameKey = normalizeGpuName(record.name);
    byName.set(nameKey, [...(byName.get(nameKey) ?? []), record]);

    const identity = extractGpuIdentity(record.name);
    // Only names that are exactly one recognised model join a variant group; "RTX 3050 OEM" stays by name.
    if (identity === null || identity.residual !== "") continue;
    const entry: Entry = { record, maxQ: identity.maxQ };
    const target =
      identity.memoryGb === null
        ? groupFor(base, identity.key)
        : groupFor(withMemory, `${identity.key}-${identity.memoryGb}gb`);
    if (identity.memoryGb !== null) {
      const variants = memoryVariants.get(identity.key) ?? [];
      if (!variants.includes(target)) memoryVariants.set(identity.key, [...variants, target]);
    }
    (isLaptopRecord(record, identity) ? target.laptop : target.desktop).push(entry);
  }

  const resolveGroup = (
    query: string | GpuIdentity,
    identity: GpuIdentity,
    formFactor: FormFactor,
  ): { records: GpuBenchmarkRecord[]; unsure: boolean } | null => {
    const memoryGroup =
      identity.memoryGb === null
        ? undefined
        : withMemory.get(`${identity.key}-${identity.memoryGb}gb`);
    const baseGroup = base.get(identity.key);
    const unstated =
      identity.memoryGb === null && baseGroup === undefined
        ? memoryVariants.get(identity.key)
        : undefined;
    if (memoryGroup === undefined && baseGroup === undefined && unstated === undefined) return null;
    const pick = (side: "laptop" | "desktop"): Entry[] => {
      if (unstated !== undefined) return unstated.flatMap((group) => group[side]);
      const fromMemory = memoryGroup?.[side] ?? [];
      return fromMemory.length > 0 ? fromMemory : (baseGroup?.[side] ?? []);
    };
    const mobile = pick("laptop");
    const laptop = collapseByExactName(narrowByMaxQ(mobile, identity.maxQ), query);
    const desktop = collapseByExactName(pick("desktop"), query);
    const found = (entries: readonly Entry[], unsure = false) => ({
      records: entries.map((e) => e.record),
      unsure,
    });
    // Text without "Max-Q" for a model PassMark only lists as Max-Q: the card may be the faster full-power one.
    const onlyMaxQ = !identity.maxQ && mobile.length > 0 && mobile.every((e) => e.maxQ);

    const effective: FormFactor = identity.variant === "laptop" ? "laptop" : formFactor;
    if (effective === "laptop") {
      return laptop.length > 0 ? found(laptop, onlyMaxQ) : found(desktop);
    }
    if (effective === "desktop")
      return found(desktop.length > 0 ? desktop : laptop, onlyMaxQ && desktop.length === 0);
    return found([...desktop, ...laptop]);
  };

  return {
    match(query, options) {
      const formFactor = options?.formFactor ?? "unknown";
      const identity = typeof query === "string" ? extractGpuIdentity(query) : query;
      // Text with extra words ("RTX 3050 OEM") is first tried as a whole PassMark name, so decorated
      // records are not swallowed by the plain model's group.
      if (typeof query === "string" && identity?.residual) {
        const named = byName.get(normalizeGpuName(query));
        if (named !== undefined) return asResult(named, query);
      }
      if (identity !== null) {
        const group = resolveGroup(query, identity, formFactor);
        if (group !== null) return asResult(group.records, query, group.unsure);
      }
      if (typeof query !== "string") return { status: "no_match" };
      return asResult(byName.get(normalizeGpuName(query)) ?? [], query);
    },
  };
}
