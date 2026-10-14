import {
  type BenchmarkSnapshot,
  type CohortPolicy,
  createGpuStrategies,
  type GpuBenchmarkRecord,
  graphicsMemoryOf,
  rateGpuMatch,
} from "@idealo-hw/hw-bench";
import type { ItemRating, RatingQuery } from "./engine";
import { createDedicatedFinder, memoryWrittenIn } from "./gpu-dedicated";
import { createIntegratedFinder, type IntegratedFound } from "./gpu-integrated";
import { dedicatedMemory, integratedMemory } from "./gpu-memory";
import type { GpuPart, GpuReading } from "./gpu-reading";
import { cpuSourcesOf, gpuSourcesOf } from "./gpu-sources";

export interface GpuEngine {
  /**
   * One entry per query: null when the text names no card and the CPU has no known iGPU. `cpus` are the CPU engine's
   * results for the same queries; a matched one names the CPU even when the tile abbreviates it.
   */
  rate(
    queries: readonly RatingQuery[],
    cpus?: readonly (ItemRating | undefined)[],
  ): (GpuReading | null)[];
}

const asPart = (found: IntegratedFound, memory: GpuPart["memory"]): GpuPart => ({
  kind: "integrated",
  name: found.name,
  rating: found.rating,
  memory,
  approximated: found.approximated,
});

/**
 * Builds the matchers and strategies once for a snapshot. The GPU line is the dedicated card the text names, else the
 * iGPU the CPU table gives; a tile naming both shows the card (the iGPU rides along for the card). An ambiguous card is
 * rated by its weakest candidate (`rateGpuMatch`), so the line never promises more than the worst card the text could
 * mean.
 */
export function createGpuEngine(
  snapshot: BenchmarkSnapshot<GpuBenchmarkRecord>,
  cohortPolicy?: CohortPolicy,
): GpuEngine {
  const strategies = createGpuStrategies(snapshot, cohortPolicy);
  const dedicated = createDedicatedFinder(snapshot);
  const integrated = createIntegratedFinder(snapshot, strategies);

  return {
    rate(queries, cpus = []) {
      return queries.map((query, i) => {
        const formFactor = query.formFactor ?? "unknown";
        const price = query.priceEur === undefined ? {} : { priceEur: query.priceEur };
        const sources = gpuSourcesOf(query);
        const stated = graphicsMemoryOf(sources);

        let card: GpuPart | null = null;
        const found = dedicated.find(sources, formFactor);
        const rated =
          found === null ? null : rateGpuMatch(strategies, found.match, { formFactor, ...price });
        if (found !== null && rated !== null && rated.ratings.length > 0) {
          card = {
            kind: "dedicated",
            name: rated.record.name,
            rating: rated,
            memory: dedicatedMemory(
              stated,
              memoryWrittenIn(found.source),
              rated.record.memorySizeMb,
            ),
            approximated: false,
          };
        }

        const cpu = cpus[i];
        const igpu = integrated.find(
          cpuSourcesOf(query, cpu?.status === "matched" ? cpu.record.name : undefined),
          { formFactor, ...price },
        );
        const chip = igpu === null ? null : asPart(igpu, integratedMemory());
        const primary = card ?? chip;
        return primary === null ? null : { primary, companion: card === null ? null : chip };
      });
    },
  };
}
