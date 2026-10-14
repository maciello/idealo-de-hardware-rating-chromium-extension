import {
  type BenchmarkSnapshot,
  type CohortPolicy,
  type CpuBenchmarkRecord,
  createCanonicalKeyMatcher,
  createStrategies,
  type FormFactor,
  type FreeTextMatchResult,
  type Rating,
  type RatingStrategy,
} from "@idealo-hw/hw-bench";
import { type Signal, senseAll } from "@idealo-hw/sensors";
import { type RamType, ramTypeOf } from "./ram-type";
import { sensorInputOf } from "./sensor-input";

export interface RatingQuery {
  title: string;
  text: string;
  priceEur?: number | undefined;
  /** Device class of the page the item sits on; ranks the CPU against laptop or desktop CPUs. */
  formFactor?: FormFactor | undefined;
}

export type ItemRating =
  | {
      status: "matched";
      record: CpuBenchmarkRecord;
      via: "exact" | "normalized" | "model_token";
      /** Device class the ratings were computed for; names the comparison group on the chip. */
      formFactor: FormFactor;
      /** System memory type the item states; null when it names none. */
      ramType: RamType | null;
      ratings: readonly Rating[];
      /** Badges and flags the product sensors raised; empty when nothing stands out. */
      signals: readonly Signal[];
      /** Position among the matched products of the same page (1 = fastest); null below two peers. */
      pageRank: PageRank | null;
    }
  | { status: "ambiguous"; candidates: readonly CpuBenchmarkRecord[] }
  | { status: "no_match" };

export interface PageRank {
  rank: number;
  total: number;
}

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

const MIN_PEERS = 2;

/** Ties share the better rank. */
const pageRankOf = (cpuMark: number, peers: readonly { cpuMark: number }[]): PageRank | null =>
  peers.length < MIN_PEERS
    ? null
    : { rank: 1 + peers.filter((p) => p.cpuMark > cpuMark).length, total: peers.length };

const priceOf = (query: RatingQuery | undefined): { priceEur?: number } =>
  query?.priceEur === undefined ? {} : { priceEur: query.priceEur };

type CpuMatch = FreeTextMatchResult<CpuBenchmarkRecord>;

const NO_MATCH: CpuMatch = { status: "no_match" };

/** A match through a bare model token is the weakest evidence; ambiguity from a real name beats it. */
const strength = (match: CpuMatch): number => {
  if (match.status === "matched") return match.via === "model_token" ? 1 : 3;
  return match.status === "ambiguous" ? 2 : 0;
};

/** Tile spec fragments ("Intel Core i5-10210U", "32 GB RAM") or datasheet lines; free text stays one piece. */
const fragmentsOf = (text: string): string[] =>
  text
    .split(/\n|,\s+/)
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment !== "");

const formFactorOf = (query: RatingQuery | undefined): FormFactor => query?.formFactor ?? "unknown";

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
  cohortPolicy?: CohortPolicy,
): RatingEngine {
  const matcher = createCanonicalKeyMatcher(snapshot);
  const enabled = new Set(enabledStrategyIds);
  const strategies: readonly RatingStrategy[] = createStrategies(snapshot, cohortPolicy).filter(
    (s) => enabled.has(s.id),
  );

  return {
    rate(queries) {
      const matches = queries.map(({ title, text }) => {
        // Spec fragments name the CPU more reliably than a marketing title; the title is the fallback.
        let best = NO_MATCH;
        for (const source of [...fragmentsOf(text), title]) {
          const found = matcher.matchText(source);
          if (strength(found) > strength(best)) best = found;
          if (strength(best) === 3) break;
        }
        return best;
      });
      const peers = matches.flatMap((match, i) =>
        match.status === "matched"
          ? [{ cpuMark: match.record.cpuMark, ...priceOf(queries[i]) }]
          : [],
      );
      return matches.map((match, i): ItemRating => {
        if (match.status !== "matched") return match;
        const ratings = strategies.flatMap((strategy) => {
          const rating = strategy.rate({
            cpu: match.record,
            ...priceOf(queries[i]),
            peers,
            formFactor: formFactorOf(queries[i]),
          });
          return rating === null ? [] : [rating];
        });
        return {
          status: "matched",
          record: match.record,
          via: match.via,
          formFactor: formFactorOf(queries[i]),
          ramType: ramTypeOf(queries[i]?.text ?? ""),
          ratings,
          signals: senseAll(sensorInputOf(match.record, formFactorOf(queries[i]))),
          pageRank: pageRankOf(match.record.cpuMark, peers),
        };
      });
    },
  };
}
