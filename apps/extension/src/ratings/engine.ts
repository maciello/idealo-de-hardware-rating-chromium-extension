import {
  type BenchmarkSnapshot,
  type CpuBenchmarkRecord,
  createCanonicalKeyMatcher,
  createStrategies,
  extractCpuIdentity,
  type Rating,
  type RatingStrategy,
} from "@idealo-hw/hw-bench";

export interface RatingQuery {
  title: string;
  text: string;
  priceEur?: number | undefined;
}

export type ItemRating =
  | {
      status: "matched";
      record: CpuBenchmarkRecord;
      via: "exact" | "normalized";
      ratings: readonly Rating[];
    }
  | { status: "ambiguous"; candidates: readonly CpuBenchmarkRecord[] }
  | { status: "no_match" };

export interface StrategyInfo {
  id: string;
  label: string;
}

const emptySnapshot: BenchmarkSnapshot<CpuBenchmarkRecord> = {
  sourceId: "none",
  kind: "cpu",
  importedAt: null,
  records: [],
  rejected: [],
};

/** All strategies offered to the user, independent of any imported data. */
export const STRATEGY_CATALOG: readonly StrategyInfo[] = createStrategies(emptySnapshot).map(
  ({ id, label }) => ({ id, label }),
);

/** Resolves stored settings (null = never saved) to the strategy ids that should render. */
export const resolveEnabledStrategyIds = (stored: readonly string[] | undefined): string[] => {
  const known = new Set(STRATEGY_CATALOG.map((s) => s.id));
  return stored === undefined ? [...known] : stored.filter((id) => known.has(id));
};

const priceOf = (query: RatingQuery | undefined): { priceEur?: number } =>
  query?.priceEur === undefined ? {} : { priceEur: query.priceEur };

export interface RatingEngine {
  rate(queries: readonly RatingQuery[]): ItemRating[];
}

/**
 * Builds the matcher and strategies once for a snapshot; `rate` is then cheap enough to run on every
 * DOM mutation. `peers` for context-dependent strategies are all matched queries of the same call.
 */
export function createRatingEngine(
  snapshot: BenchmarkSnapshot<CpuBenchmarkRecord>,
  enabledStrategyIds: readonly string[],
): RatingEngine {
  const matcher = createCanonicalKeyMatcher(snapshot);
  const enabled = new Set(enabledStrategyIds);
  const strategies: readonly RatingStrategy[] = createStrategies(snapshot).filter((s) =>
    enabled.has(s.id),
  );

  return {
    rate(queries) {
      const matches = queries.map(({ title, text }) => {
        const identity = extractCpuIdentity(title) ?? extractCpuIdentity(text);
        return identity === null ? ({ status: "no_match" } as const) : matcher.match(identity);
      });
      const peers = matches.flatMap((match, i) =>
        match.status === "matched"
          ? [{ cpuMark: match.record.cpuMark, ...priceOf(queries[i]) }]
          : [],
      );
      return matches.map((match, i): ItemRating => {
        if (match.status !== "matched") return match;
        const ratings = strategies.flatMap((strategy) => {
          const rating = strategy.rate({ cpu: match.record, ...priceOf(queries[i]), peers });
          return rating === null ? [] : [rating];
        });
        return { status: "matched", record: match.record, via: match.via, ratings };
      });
    },
  };
}
