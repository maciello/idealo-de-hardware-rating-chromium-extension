import {
  type BenchmarkSnapshot,
  type CohortPolicy,
  type CpuBenchmarkRecord,
  createCanonicalKeyMatcher,
  createStrategies,
  type FormFactor,
  type FreeTextMatchResult,
  type RatingStrategy,
  ramTypeOf,
} from "@idealo-hw/hw-bench";
import { senseAll } from "@idealo-hw/sensors";
import type { RatingQuery } from "../query";
import { fragmentsOf } from "../text-fragments";
import { pageRankOf } from "./page-rank";
import { sensorInputOf } from "./sensor-input";
import type { ItemRating, RatingEngine } from "./types";

const priceOf = (query: RatingQuery | undefined): { priceEur?: number } =>
  query?.priceEur === undefined ? {} : { priceEur: query.priceEur };

type CpuMatch = FreeTextMatchResult<CpuBenchmarkRecord>;

const NO_MATCH: CpuMatch = { status: "no_match" };

/** A match through a bare model token is the weakest evidence; ambiguity from a real name beats it. */
const strength = (match: CpuMatch): number => {
  if (match.status === "matched") return match.via === "model_token" ? 1 : 3;
  return match.status === "ambiguous" ? 2 : 0;
};

const formFactorOf = (query: RatingQuery | undefined): FormFactor => query?.formFactor ?? "unknown";

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
