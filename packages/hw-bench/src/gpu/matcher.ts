import type { BenchmarkSnapshot, GpuBenchmarkRecord } from "../benchmark";
import type { FormFactor } from "../identity";
import type { MatchResult } from "../matcher";
import {
  extractGpuIdentity,
  type GpuIdentity,
  looseGpuNameKey,
  normalizeGpuName,
  quadroWithoutMobileSuffix,
  splitCombinedModelName,
} from "./identity";

export interface GpuMatchOptions {
  /** Where the product is used; defaults to "unknown". Text that says "Laptop GPU" overrides it. */
  readonly formFactor?: FormFactor;
}

/** Port: maps GPU text to a PassMark record, taking the product's form factor into account. */
export interface GpuMatcher {
  match(query: string | GpuIdentity, options?: GpuMatchOptions): MatchResult<GpuBenchmarkRecord>;
}

/** What a record says about where it is used. "neutral" fits both: integrated graphics, workstation and uncategorised cards. */
type RecordForm = "laptop" | "desktop" | "neutral";

interface Entry {
  readonly record: GpuBenchmarkRecord;
  readonly maxQ: boolean;
  readonly form: RecordForm;
  /** The record is named after several models ("Radeon RX 470/570"); a record of exactly this model outranks it. */
  readonly combined: boolean;
}

interface Group {
  readonly entries: Entry[];
}

/**
 * A memoryless record below this share of its model's samples is noise, not the model's default: PassMark files
 * a handful of unsized submissions next to the sized cards ("RTX 3050 Laptop GPU": 4 samples beside 21179 and 7510).
 */
const NEGLIGIBLE_SAMPLE_SHARE = 0.01;

const byNameThenId = (a: GpuBenchmarkRecord, b: GpuBenchmarkRecord): number =>
  a.name.localeCompare(b.name) || a.id - b.id;

/**
 * The name says Laptop GPU / (Mobile) / Max-Q, or PassMark files the card under Mobile only. Integrated graphics
 * carry no form factor through PassMark's category (the same iGPU is benchmarked in laptops and desktops).
 */
function formOf(record: GpuBenchmarkRecord, identity: GpuIdentity): RecordForm {
  if (identity.variant === "laptop") return "laptop";
  if (identity.integrated) return "neutral";
  const mobile = record.segments.includes("mobile");
  const desktop = record.segments.includes("desktop");
  if (mobile && !desktop) return "laptop";
  if (desktop && !mobile) return "desktop";
  return "neutral";
}

const groupFor = (map: Map<string, Group>, key: string): Group => {
  const existing = map.get(key);
  if (existing !== undefined) return existing;
  const created: Group = { entries: [] };
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

const preferSingleModel = (entries: Entry[]): Entry[] =>
  entries.some((e) => !e.combined) ? entries.filter((e) => !e.combined) : entries;

/** Max-Q is a power variant: say it and get it; do not say it and get the plain mobile record when there is one. */
function narrowByMaxQ(entries: readonly Entry[], maxQ: boolean): Entry[] {
  const preferred = entries.filter((e) => e.maxQ === maxQ);
  return preferred.length > 0 ? preferred : [...entries];
}

const samplesOf = (entries: readonly Entry[]): number =>
  entries.reduce((sum, e) => sum + (e.record.samples ?? 0), 0);

/** True when the plain records carry so few samples next to the sized siblings that they cannot stand for the model. */
function isNegligible(plain: readonly Entry[], sized: readonly Entry[]): boolean {
  if (sized.length === 0 || plain.some((e) => e.record.samples === null)) return false;
  const plainSamples = samplesOf(plain);
  return plainSamples < NEGLIGIBLE_SAMPLE_SHARE * (plainSamples + samplesOf(sized));
}

/** PassMark lists some GPUs twice ("Intel UHD 770", "Intel UHD Graphics 770"); an exact name settles it. */
function collapseByExactName(entries: readonly Entry[], query: string | GpuIdentity): Entry[] {
  if (typeof query !== "string" || entries.length < 2) return [...entries];
  const exact = entries.filter((e) => e.record.name.trim() === query.trim());
  return exact.length === 1 ? exact : [...entries];
}

/**
 * Builds the lookup tables once. Records are grouped by identity key (model without "Laptop GPU",
 * "(Mobile)", "with Max-Q Design"); every record in a group is a laptop, desktop or neutral one. Lookup order:
 * identity key with memory ("rtx-3050-6gb"), identity key, then the whole normalized name. Never fuzzy.
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
export function createGpuMatcher(snapshot: BenchmarkSnapshot<GpuBenchmarkRecord>): GpuMatcher {
  const withMemory = new Map<string, Group>();
  /** Memory-qualified groups of a model, for texts that give no memory ("RTX 5060 Ti" -> its 8GB and 16GB cards). */
  const memoryVariants = new Map<string, Group[]>();
  const base = new Map<string, Group>();
  const byName = new Map<string, GpuBenchmarkRecord[]>();
  /** Same records under `looseGpuNameKey`; only read when `byName` has nothing. */
  const byLooseName = new Map<string, GpuBenchmarkRecord[]>();

  for (const record of snapshot.records) {
    const nameKey = normalizeGpuName(record.name);
    byName.set(nameKey, [...(byName.get(nameKey) ?? []), record]);
    const looseKey = looseGpuNameKey(record.name);
    byLooseName.set(looseKey, [...(byLooseName.get(looseKey) ?? []), record]);

    const modelNames = splitCombinedModelName(record.name);
    for (const modelName of modelNames) {
      const identity = extractGpuIdentity(modelName);
      // Only names that are exactly one recognised model join a variant group; "RTX 3050 OEM" stays by name.
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
    const sizedGroups = memoryVariants.get(identity.key) ?? [];
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
    const found = (entries: readonly Entry[], unsure = false) => ({
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
      const byWord = byName.get(normalizeGpuName(query)) ?? byLooseName.get(looseGpuNameKey(query));
      if (byWord !== undefined) return asResult(byWord, query);
      const unsuffixed = quadroWithoutMobileSuffix(query);
      if (unsuffixed === null || formFactor === "desktop") return { status: "no_match" };
      // Mobile "M" omitted by PassMark: only a card PassMark files under Mobile and not under Desktop.
      const mobile = (byName.get(unsuffixed) ?? []).filter(
        (r) => r.segments.includes("mobile") && !r.segments.includes("desktop"),
      );
      return asResult(mobile, query);
    },
  };
}
