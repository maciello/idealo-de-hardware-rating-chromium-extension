import type { GpuBenchmarkRecord } from "../../benchmark";
import type { MatchResult } from "../../matcher";
import type { GpuIdentity } from "../identity";

const byNameThenId = (a: GpuBenchmarkRecord, b: GpuBenchmarkRecord): number =>
  a.name.localeCompare(b.name) || a.id - b.id;

export const asResult = (
  records: readonly GpuBenchmarkRecord[],
  query: string | GpuIdentity,
  unsure = false,
): MatchResult<GpuBenchmarkRecord> => {
  const [only] = records;
  if (records.length === 0) return { status: "no_match" };
  if (records.length === 1 && only !== undefined && !unsure) {
    const exact = typeof query === "string" && only.name.trim() === query.trim();
    return { status: "matched", record: only, via: exact ? "exact" : "normalized" };
  }
  return { status: "ambiguous", candidates: [...records].sort(byNameThenId) };
};
