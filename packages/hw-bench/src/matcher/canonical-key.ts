import type { CpuBenchmarkRecord } from "../benchmark/records";
import type { BenchmarkSnapshot } from "../benchmark/snapshot";
import {
  type CpuIdentity,
  cpuNameKeys,
  extractCpuIdentity,
  normalizeCpuName,
} from "../identity/cpu-identity";
import type { Matcher, MatchResult } from "./matcher";

interface Entry {
  readonly record: CpuBenchmarkRecord;
  /** Loses against a lower penalty with the same key; see `CpuNameKey`. */
  readonly penalty: number;
}

function push(index: Map<string, Entry[]>, key: string, entry: Entry): void {
  const bucket = index.get(key);
  if (bucket === undefined) index.set(key, [entry]);
  else bucket.push(entry);
}

/** Single-socket results first, then undecorated names; remaining ties are ambiguous. */
function resolve(
  entries: readonly Entry[] | undefined,
  via: "exact" | "normalized",
): MatchResult<CpuBenchmarkRecord> {
  if (entries === undefined || entries.length === 0) return { status: "no_match" };
  const rank = (e: Entry): number => e.record.socketCount * 10 + e.penalty;
  const best = Math.min(...entries.map(rank));
  const tied = entries.filter((e) => rank(e) === best).map((e) => e.record);
  const [only] = tied;
  if (tied.length === 1 && only !== undefined) return { status: "matched", record: only, via };
  return {
    status: "ambiguous",
    candidates: [...tied].sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id),
  };
}

/**
 * Builds the lookup tables once (O(n)); each `match` is a few Map reads.
 * Order: exact PassMark name, then extracted identity key, then normalized whole text. Never fuzzy.
 */
export function createCanonicalKeyMatcher(
  snapshot: BenchmarkSnapshot<CpuBenchmarkRecord>,
): Matcher<CpuBenchmarkRecord> {
  const byName = new Map<string, Entry[]>();
  const byKey = new Map<string, Entry[]>();
  for (const record of snapshot.records) {
    push(byName, record.name.trim(), { record, penalty: 0 });
    for (const { key, penalty } of cpuNameKeys(record.name)) push(byKey, key, { record, penalty });
  }

  const matchKey = (identity: CpuIdentity): MatchResult<CpuBenchmarkRecord> =>
    resolve(byKey.get(identity.key), "normalized");

  return {
    match(query) {
      if (typeof query !== "string") return matchKey(query);
      const exact = resolve(byName.get(query.trim()), "exact");
      if (exact.status !== "no_match") return exact;
      const identity = extractCpuIdentity(query);
      if (identity !== null) return matchKey(identity);
      return resolve(byKey.get(normalizeCpuName(query)), "normalized");
    },
  };
}
