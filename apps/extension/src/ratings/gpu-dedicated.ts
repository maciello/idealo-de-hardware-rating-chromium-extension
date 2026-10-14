import {
  type BenchmarkSnapshot,
  createGpuMatcher,
  extractGpuIdentity,
  type FormFactor,
  type GpuBenchmarkRecord,
  isIntegratedGpu,
  type MatchResult,
} from "@idealo-hw/hw-bench";

type GpuMatch = MatchResult<GpuBenchmarkRecord>;

/** A dedicated card the text names: the match, and the source it was read from. */
export interface DedicatedFound {
  readonly match: GpuMatch;
  readonly source: string;
}

const strength = (match: GpuMatch): number =>
  match.status === "matched" ? 2 : match.status === "ambiguous" ? 1 : 0;

const recordsOf = (match: GpuMatch): readonly GpuBenchmarkRecord[] =>
  match.status === "matched" ? [match.record] : "candidates" in match ? match.candidates : [];

/** Integrated graphics in the text are no card, and they never decide the line: the CPU's own iGPU does. */
const isDedicated = (match: GpuMatch): boolean =>
  strength(match) > 0 && recordsOf(match).every((record) => !isIntegratedGpu(record.name));

export interface DedicatedFinder {
  /** The strongest dedicated card among the sources, the earliest on a tie; null when none names one. */
  find(sources: readonly string[], formFactor: FormFactor): DedicatedFound | null;
}

/**
 * Reads the text for a dedicated card. A tile that names an iGPU first and a card second still yields the card:
 * integrated matches are skipped, not ranked. Matches are cached per source, the scan runs on every DOM mutation.
 */
export function createDedicatedFinder(
  snapshot: BenchmarkSnapshot<GpuBenchmarkRecord>,
): DedicatedFinder {
  const matcher = createGpuMatcher(snapshot);
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
    find(sources, formFactor) {
      let best: DedicatedFound | null = null;
      for (const source of sources) {
        const match = matchOf(source, formFactor);
        if (!isDedicated(match)) continue;
        if (best === null || strength(match) > strength(best.match)) best = { match, source };
        if (strength(match) === 2) break;
      }
      return best;
    },
  };
}

/** The size written behind the model in the source ("RTX 4060 (8GB)"), null when it states none. */
export const memoryWrittenIn = (source: string): number | null =>
  extractGpuIdentity(source)?.memoryGb ?? null;
