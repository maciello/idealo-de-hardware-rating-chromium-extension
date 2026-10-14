import {
  type BenchmarkSnapshot,
  createGpuNameLookup,
  type FormFactor,
  type GpuBenchmarkRecord,
  type GpuMatchRating,
  type GpuRatingStrategy,
  type IgpuRule,
  integratedGpuOf,
  rateGpuMatch,
} from "@idealo-hw/hw-bench";

/** The graphics inside a CPU, rated when PassMark has a row for them. */
export interface IntegratedFound {
  readonly name: string;
  /** Null for graphics PassMark does not list, and for a row the imported snapshot lacks. */
  readonly rating: GpuMatchRating | null;
  readonly approximated: boolean;
}

export interface IntegratedFinder {
  /** The CPU's iGPU from the first source that names a CPU the table knows; null when it has none or is unknown. */
  find(
    cpuSources: readonly string[],
    options: { formFactor: FormFactor; priceEur?: number | undefined },
  ): IntegratedFound | null;
}

const PROXY_NOTE = "proxy_row=true";

/**
 * The iGPU is looked up from the CPU, never read from GPU text: a declarative table in hw-bench maps the CPU to the
 * exact PassMark GPU name, which is then resolved in the snapshot by name. Rules are cached per source text.
 */
export function createIntegratedFinder(
  snapshot: BenchmarkSnapshot<GpuBenchmarkRecord>,
  strategies: readonly GpuRatingStrategy[],
): IntegratedFinder {
  const recordNamed = createGpuNameLookup(snapshot.records);
  const rules = new Map<string, IgpuRule | null>();
  const ruleOf = (source: string): IgpuRule | null => {
    const known = rules.get(source);
    if (known !== undefined) return known;
    const found = integratedGpuOf(source);
    rules.set(source, found);
    return found;
  };
  return {
    find(cpuSources, { formFactor, priceEur }) {
      const rule = cpuSources.map(ruleOf).find((found) => found !== null) ?? null;
      if (rule === null || rule.igpu.kind === "none") return null;
      const approximated = rule.caveat.includes(PROXY_NOTE);
      const record = rule.igpu.kind === "passmark" ? recordNamed(rule.igpu.name) : null;
      if (record === null) return { name: rule.igpu.name, rating: null, approximated };
      const rated = rateGpuMatch(
        strategies,
        { status: "matched", record, via: "exact" },
        { formFactor, ...(priceEur === undefined ? {} : { priceEur }) },
      );
      const rating = rated !== null && rated.ratings.length > 0 ? rated : null;
      return { name: record.name, rating, approximated };
    },
  };
}
