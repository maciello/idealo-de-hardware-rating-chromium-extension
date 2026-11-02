import type { Candidate } from "./candidate";

const union = <T>(lists: readonly (readonly T[])[]): T[] => [...new Set(lists.flat())];

const time = (candidate: Candidate): number => Date.parse(candidate.fetched_at);

/**
 * Pools candidates by sku. found_by, notes, agent_flags and features are unions; every other field comes from the
 * entry with the latest fetched_at (the later entry in input order on a tie). Output order follows the first
 * appearance of each sku.
 */
export function poolCandidates(entries: readonly Candidate[]): Candidate[] {
  const groups = new Map<string, Candidate[]>();
  for (const entry of entries) {
    const group = groups.get(entry.sku);
    if (group === undefined) groups.set(entry.sku, [entry]);
    else group.push(entry);
  }
  return [...groups.values()].map((group) => {
    const latest = group.reduce((best, next) => (time(next) >= time(best) ? next : best));
    return {
      ...latest,
      found_by: union(group.map((entry) => entry.found_by)),
      notes: union(group.map((entry) => entry.notes)),
      agent_flags: union(group.map((entry) => entry.agent_flags)),
      features: union(group.map((entry) => entry.features)),
    };
  });
}
