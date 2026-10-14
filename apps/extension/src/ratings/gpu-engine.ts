import {
  type BenchmarkSnapshot,
  type CohortPolicy,
  createGpuMatcher,
  createGpuStrategies,
  type FormFactor,
  type GpuBenchmarkRecord,
  type GpuMatchRating,
  type MatchResult,
  parseSpecBlock,
  productContextFromSpecs,
  rateGpuMatch,
} from "@idealo-hw/hw-bench";
import type { RatingQuery } from "./engine";
import { fragmentsOf } from "./text-fragments";

type GpuMatch = MatchResult<GpuBenchmarkRecord>;

const NO_MATCH: GpuMatch = { status: "no_match" };

const strength = (match: GpuMatch): number =>
  match.status === "matched" ? 2 : match.status === "ambiguous" ? 1 : 0;

/** The datasheet's graphics row first, then spec fragments, then the marketing title as the fallback. */
const sourcesOf = ({ title, text }: RatingQuery): string[] => {
  const labelled = productContextFromSpecs(parseSpecBlock(text)).gpuText;
  return [...(labelled === undefined ? [] : [labelled]), ...fragmentsOf(text), title];
};

export interface GpuEngine {
  /** One entry per query: null when the text names no GPU the snapshot knows. */
  rate(queries: readonly RatingQuery[]): (GpuMatchRating | null)[];
}

/**
 * Builds the matcher and strategies once for a snapshot. An ambiguous match is rated by its weakest
 * candidate (`rateGpuMatch`), so the line never promises more than the worst card the text could mean.
 */
export function createGpuEngine(
  snapshot: BenchmarkSnapshot<GpuBenchmarkRecord>,
  cohortPolicy?: CohortPolicy,
): GpuEngine {
  const matcher = createGpuMatcher(snapshot);
  const strategies = createGpuStrategies(snapshot, cohortPolicy);
  const matches = new Map<string, GpuMatch>();
  const matchOf = (source: string, formFactor: FormFactor): GpuMatch => {
    const key = `${formFactor}\u0000${source}`;
    const known = matches.get(key);
    if (known !== undefined) return known;
    const found = matcher.match(source, { formFactor });
    matches.set(key, found);
    return found;
  };

  return {
    rate(queries) {
      return queries.map((query) => {
        const formFactor = query.formFactor ?? "unknown";
        let best = NO_MATCH;
        for (const source of sourcesOf(query)) {
          const found = matchOf(source, formFactor);
          if (strength(found) > strength(best)) best = found;
          if (strength(best) === 2) break;
        }
        const rated = rateGpuMatch(strategies, best, {
          formFactor,
          ...(query.priceEur === undefined ? {} : { priceEur: query.priceEur }),
        });
        return rated !== null && rated.ratings.length > 0 ? rated : null;
      });
    },
  };
}
