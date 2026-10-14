import type { CpuBenchmarkRecord } from "../benchmark/records";
import type { BenchmarkSnapshot } from "../benchmark/snapshot";
import {
  type CpuIdentity,
  cpuNameKeys,
  extractCpuIdentity,
  normalizeCpuName,
  normalizeCpuNameWithoutVendor,
} from "../identity/cpu-identity";
import type { FreeTextMatcher, FreeTextMatchResult, MatchResult } from "./matcher";
import { bareModelTokens } from "./model-token";

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
): FreeTextMatcher<CpuBenchmarkRecord> {
  const byName = new Map<string, Entry[]>();
  const byKey = new Map<string, Entry[]>();
  const byToken = new Map<string, Entry[]>();
  for (const record of snapshot.records) {
    push(byName, record.name.trim(), { record, penalty: 0 });
    for (const { key, penalty } of cpuNameKeys(record.name)) push(byKey, key, { record, penalty });
    if (record.socketCount !== 1) continue;
    const { tokens, decorated } = bareModelTokens(record.name);
    for (const token of tokens) push(byToken, token, { record, penalty: decorated ? 1 : 0 });
  }

  const matchKey = (identity: CpuIdentity): MatchResult<CpuBenchmarkRecord> =>
    resolve(byKey.get(identity.key), "normalized");

  const matchWhole = (query: string): MatchResult<CpuBenchmarkRecord> => {
    const exact = resolve(byName.get(query.trim()), "exact");
    if (exact.status !== "no_match") return exact;
    const identity = extractCpuIdentity(query);
    if (identity !== null) return matchKey(identity);
    const generic = resolve(byKey.get(normalizeCpuName(query)), "normalized");
    if (generic.status !== "no_match") return generic;
    return resolve(byKey.get(normalizeCpuNameWithoutVendor(query)), "normalized");
  };

  const matchToken = (text: string): FreeTextMatchResult<CpuBenchmarkRecord> => {
    const found = new Map<number, CpuBenchmarkRecord>();
    for (const token of bareModelTokens(text).tokens) {
      const result = resolve(byToken.get(token), "normalized");
      if (result.status === "ambiguous") return { status: "no_match" };
      if (result.status === "matched") found.set(result.record.id, result.record);
    }
    const [only, ...others] = found.values();
    return only !== undefined && others.length === 0
      ? { status: "matched", record: only, via: "model_token" }
      : { status: "no_match" };
  };

  return {
    match(query) {
      return typeof query === "string" ? matchWhole(query) : matchKey(query);
    },
    matchText(text) {
      const whole = matchWhole(text);
      if (whole.status !== "no_match" || extractCpuIdentity(text) !== null) return whole;
      return matchToken(text);
    },
  };
}
