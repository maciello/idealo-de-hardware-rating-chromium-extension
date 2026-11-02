import { redFlags } from "./flags";
import type { RankedCandidate } from "./report";
import type { Scored } from "./score";
import type { Standout } from "./standouts";

export interface Annotations {
  standouts: Standout[];
  rare: string[];
  unverified: string[];
}

/** One ranked entry of the report from a scored candidate and the set-level findings about it. */
export function annotate(entry: Scored, rank: number, found: Annotations): RankedCandidate {
  const { item } = entry;
  const { candidate } = item;
  return {
    rank,
    sku: candidate.sku,
    name: candidate.name,
    url: candidate.url,
    product_type: candidate.product_type,
    cpu: candidate.cpu,
    gpu: candidate.gpu,
    score: entry.score,
    contributions: entry.contributions,
    metrics: item.metrics,
    ai_memory_basis: item.aiMemory.basis,
    best_offer: item.best,
    trusted_offer: item.trusted,
    cpu_benchmark: item.cpu,
    gpu_benchmark: item.gpu,
    price_context: item.price,
    standouts: found.standouts,
    features: item.features,
    rare_features: found.rare,
    red_flags: redFlags(item, found.unverified),
    found_by: candidate.found_by,
    agent_flags: candidate.agent_flags,
    notes: candidate.notes,
    system_notes: [...entry.notes, ...item.systemNotes],
  };
}
