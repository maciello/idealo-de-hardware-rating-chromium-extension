import { isModelNumberLike, tokenize } from "./tokens";

export interface Candidate<R> {
  readonly record: R;
  /** Sum of the IDF weights of the query tokens the record's name contains. Higher is better. */
  readonly score: number;
}

export interface CandidateIndexOptions<R> {
  /** The PassMark name that gets tokenized, e.g. `(r) => r.name`. */
  readonly nameOf: (record: R) => string;
}

export interface CandidatesOptions {
  /** Maximum candidates returned; defaults to 254 (a Jev choice question holds 255 options incl. none_of_the_above). */
  readonly limit?: number;
}

export interface CandidateIndex<R> {
  readonly size: number;
  /** Ranked best-first. Deterministic: the same index and text always give the same list. */
  candidatesFor(text: string, options?: CandidatesOptions): readonly Candidate<R>[];
}

export const DEFAULT_CANDIDATE_LIMIT = 254;

/** Scores are sums of floats added in query-token order; rounding hides accumulation noise in comparisons. */
const round = (value: number): number => Math.round(value * 1e9) / 1e9;

const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

interface Row<R> {
  readonly record: R;
  readonly name: string;
  readonly lowerName: string;
  readonly tokens: readonly string[];
}

/**
 * Inverted index token -> records, built once in O(total tokens). Works for any record type (CPU, GPU).
 *
 * `candidatesFor` is a candidate generator, not a matcher: it only proposes records. It is meant to be
 * followed by a bounded decision (docs/adr/0011). No fuzzy edit distance is used on purpose, because a
 * near-miss model number ("395" vs "385") must never score as "almost the same".
 */
export function createCandidateIndex<R>(
  records: readonly R[],
  options: CandidateIndexOptions<R>,
): CandidateIndex<R> {
  const rows: Row<R>[] = records.map((record) => {
    const name = options.nameOf(record);
    return {
      record,
      name,
      lowerName: name.trim().toLowerCase(),
      tokens: [...new Set(tokenize(name))],
    };
  });
  const postings = new Map<string, number[]>();
  rows.forEach((row, position) => {
    for (const token of row.tokens) {
      const bucket = postings.get(token);
      if (bucket === undefined) postings.set(token, [position]);
      else bucket.push(position);
    }
  });
  const size = rows.length;
  const idf = (token: string): number => Math.log(1 + size / (postings.get(token)?.length ?? size));
  const totalWeight = rows.map((row) => row.tokens.reduce((sum, token) => sum + idf(token), 0));

  /** Rarest model-number-like token present in the index; ties go to the longer, then alphabetically first token. */
  const seedToken = (queryTokens: readonly string[]): string | null => {
    let best: string | null = null;
    let bestDf = Number.POSITIVE_INFINITY;
    for (const token of queryTokens) {
      const df = postings.get(token)?.length;
      if (df === undefined || !isModelNumberLike(token)) continue;
      const better =
        df < bestDf ||
        (df === bestDf &&
          best !== null &&
          (token.length > best.length || (token.length === best.length && token < best)));
      if (better) {
        best = token;
        bestDf = df;
      }
    }
    return best;
  };

  return {
    size,
    candidatesFor(text, opts) {
      const limit = Math.max(0, Math.floor(opts?.limit ?? DEFAULT_CANDIDATE_LIMIT));
      const queryTokens = [...new Set(tokenize(text))].filter((token) => postings.has(token));
      if (limit === 0 || queryTokens.length === 0) return [];

      // Seed: records sharing the rarest model number. Without a model number in the query (or the index)
      // every record sharing any token is a candidate; IDF ranking still puts the specific ones first.
      const seed = seedToken(queryTokens);
      const inSeed = new Set(seed === null ? undefined : postings.get(seed));
      const overlap = new Map<number, number>();
      for (const token of queryTokens) {
        const weight = idf(token);
        for (const position of postings.get(token) ?? []) {
          if (seed !== null && !inSeed.has(position)) continue;
          overlap.set(position, (overlap.get(position) ?? 0) + weight);
        }
      }

      const queryName = text.trim().toLowerCase();
      const scored = [...overlap].map(([position, score]) => {
        const row = rows[position] as Row<R>;
        return {
          position,
          row,
          score: round(score),
          exact: row.lowerName === queryName,
          extra: round((totalWeight[position] ?? 0) - score),
        };
      });
      scored.sort(
        (a, b) =>
          b.score - a.score ||
          Number(b.exact) - Number(a.exact) ||
          a.extra - b.extra ||
          compareText(a.row.name, b.row.name) ||
          a.position - b.position,
      );
      return scored
        .slice(0, limit)
        .map((entry) => ({ record: entry.row.record, score: entry.score }));
    },
  };
}

export { isModelNumberLike, tokenize } from "./tokens";
