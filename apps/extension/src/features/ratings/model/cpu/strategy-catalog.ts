import {
  type BenchmarkSnapshot,
  type CpuBenchmarkRecord,
  createStrategies,
} from "@idealo-hw/hw-bench";
import type { StrategyInfo } from "./types";

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
