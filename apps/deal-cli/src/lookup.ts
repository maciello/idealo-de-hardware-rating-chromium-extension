import type { BenchmarkLookup, CpuBench, GpuBench } from "@idealo-hw/deal-rank";
import {
  type BenchmarkSnapshot,
  type CpuBenchmarkRecord,
  cpuScoreBounds,
  createCanonicalKeyMatcher,
  createGpuMatcher,
  createGpuNameLookup,
  type FreeTextMatchResult,
  type GpuBenchmarkRecord,
  gpuScoreBounds,
  integratedGpuOf,
  isIntegratedGpu,
} from "@idealo-hw/hw-bench";

type Match<R> = FreeTextMatchResult<R>;

const recordsOf = <R>(match: Match<R>): readonly R[] =>
  match.status === "matched"
    ? [match.record]
    : match.status === "ambiguous"
      ? match.candidates
      : [];

/** Fewest samples among the records, so a thin variant is not hidden; null when none states a count. */
const fewestSamples = (records: readonly { samples: number | null }[]): number | null => {
  const counts = records.flatMap((record) => record.samples ?? []);
  return counts.length === 0 ? null : Math.min(...counts);
};

const ambiguityNote = (what: string, variants: readonly string[]): string | undefined =>
  variants.length > 1
    ? `${what} match was ambiguous: used the lowest score of ${variants.length} variants (${variants.join(" | ")})`
    : undefined;

const withNote = <T extends { matched: string }>(value: T, note: string | undefined) =>
  note === undefined ? value : { ...value, note };

function cpuLookup(snapshot: BenchmarkSnapshot<CpuBenchmarkRecord>): BenchmarkLookup["cpu"] {
  const matcher = createCanonicalKeyMatcher(snapshot);
  return (name): CpuBench | null => {
    const match = matcher.matchText(name);
    const bounds = cpuScoreBounds(match);
    if (bounds === null) return null;
    return withNote(
      {
        cpu_mark: bounds.cpuMark.min,
        cpu_single: bounds.singleThread?.min ?? null,
        samples: fewestSamples(recordsOf(match)),
        matched: bounds.variants.join(" | "),
      },
      ambiguityNote("CPU", bounds.variants),
    );
  };
}

/**
 * GPU text that names a dedicated card wins. Otherwise generic or integrated labels ("Intel Arc Graphics",
 * "AMD Radeon Graphics") resolve through the CPU's own integrated GPU, the way the extension does it.
 */
function gpuLookup(snapshot: BenchmarkSnapshot<GpuBenchmarkRecord>): BenchmarkLookup["gpu"] {
  const matcher = createGpuMatcher(snapshot);
  const byName = createGpuNameLookup(snapshot.records);
  const fromCpu = (cpu: string | null): GpuBench | null => {
    const rule = cpu === null ? null : integratedGpuOf(cpu);
    const record = rule?.igpu.kind === "passmark" ? byName(rule.igpu.name) : null;
    return record === null
      ? null
      : {
          g3d_mark: record.g3dMark,
          samples: record.samples,
          matched: record.name,
          integrated: true,
        };
  };
  return (gpu, cpu): GpuBench | null => {
    const match = gpu === "" ? null : matcher.match(gpu, { formFactor: "laptop" });
    const records = match === null ? [] : recordsOf(match);
    const bounds = match === null ? null : gpuScoreBounds(match);
    const dedicated = bounds !== null && records.every((record) => !isIntegratedGpu(record.name));
    if (bounds !== null && dedicated) {
      return withNote(
        {
          g3d_mark: bounds.g3dMark.min,
          samples: fewestSamples(records),
          matched: bounds.variants.join(" | "),
          integrated: false,
        },
        ambiguityNote("GPU", bounds.variants),
      );
    }
    const viaCpu = fromCpu(cpu);
    if (viaCpu !== null || bounds === null) return viaCpu;
    return withNote(
      {
        g3d_mark: bounds.g3dMark.min,
        samples: fewestSamples(records),
        matched: bounds.variants.join(" | "),
        integrated: true,
      },
      ambiguityNote("GPU", bounds.variants),
    );
  };
}

/** Benchmark port over PassMark snapshots; a missing snapshot answers null for its side. */
export function createBenchmarkLookup(
  cpu: BenchmarkSnapshot<CpuBenchmarkRecord> | null,
  gpu: BenchmarkSnapshot<GpuBenchmarkRecord> | null,
): BenchmarkLookup {
  return {
    cpu: cpu === null ? () => null : cpuLookup(cpu),
    gpu: gpu === null ? () => null : gpuLookup(gpu),
  };
}
