import type { BenchmarkLookup, CpuBench, GpuBench } from "./benchmark";
import type { Candidate } from "./candidate";
import { type AiMemory, aiMemory, hasUnifiedFastMemory, webcamMegapixels } from "./derive";
import { featuresOf } from "./features";
import type { MetricValues } from "./metrics";
import { bestOffer, type OfferView, shopTrust, trustedOffer } from "./offers";
import { type PriceContext, priceContext } from "./price-context";

/** A candidate with everything derived from it; every later step reads this, never the raw entry. */
export interface Evaluated {
  candidate: Candidate;
  best: OfferView;
  trusted: OfferView | null;
  cpu: CpuBench | null;
  gpu: GpuBench | null;
  price: PriceContext | null;
  webcamMp: number | null;
  aiMemory: AiMemory;
  dedicatedGpu: boolean | null;
  unifiedFast: boolean;
  /** Derived laptop features plus the agent-listed ones. */
  features: string[];
  metrics: MetricValues;
  /** Benchmark notes, e.g. an ambiguous match resolved to its lower bound. */
  systemNotes: string[];
}

const present = (values: Record<string, number | null | undefined>): MetricValues =>
  Object.fromEntries(
    Object.entries(values).flatMap(([key, value]) =>
      value === null || value === undefined ? [] : [[key, value]],
    ),
  );

/** Dedicated when the sheet gives VRAM, else from the benchmark's view of the GPU; null when neither says. */
function isDedicated(candidate: Candidate, gpu: GpuBench | null): boolean | null {
  if (candidate.vram_gb !== null) return candidate.vram_gb > 0;
  return gpu === null ? null : !gpu.integrated;
}

/** Metric key of a weighted feature in the score: 1 when the candidate has it, else 0. */
export const featureMetric = (name: string): string => `feature:${name}`;

export function evaluate(
  candidate: Candidate,
  lookup: BenchmarkLookup,
  weightedFeatures: readonly string[] = [],
): Evaluated {
  const best = bestOffer(candidate.offers);
  if (best === null) throw new Error(`candidate ${candidate.sku} has no offers`);
  const cpu = candidate.cpu === null ? null : lookup.cpu(candidate.cpu);
  const gpu =
    candidate.gpu === null && candidate.cpu === null
      ? null
      : lookup.gpu(candidate.gpu ?? "", candidate.cpu);
  const price = priceContext({
    historyCents: candidate.price_history_cents,
    bestPriceEur: best.price_eur,
    bargainBadgePct: candidate.bargain_badge_pct,
  });
  const ai = aiMemory(candidate);
  const dedicatedGpu = isDedicated(candidate, gpu);
  const webcamMp = webcamMegapixels(candidate.webcam);
  const vram = candidate.vram_gb ?? (gpu?.integrated === true ? 0 : null);
  const unifiedFast = hasUnifiedFastMemory(candidate);
  const features = featuresOf({ candidate, dedicatedGpu, unifiedFast });
  return {
    candidate,
    best,
    trusted: trustedOffer(candidate.offers),
    cpu,
    gpu,
    price,
    webcamMp,
    aiMemory: ai,
    dedicatedGpu,
    unifiedFast,
    features,
    metrics: present({
      ...candidate.extra,
      cpu_mark: cpu?.cpu_mark,
      cpu_single: cpu?.cpu_single,
      g3d_mark: gpu?.g3d_mark,
      ram_gb: candidate.ram_gb,
      ai_memory_gb: ai.gb,
      vram_gb: vram,
      webcam_mp: webcamMp,
      display_nits: candidate.display.nits,
      refresh_hz: candidate.display.refresh_hz,
      battery_wh: candidate.battery_wh,
      ssd_gb: candidate.ssd_gb,
      shop_trust: shopTrust(best),
      price: best.total_eur,
      weight_kg: candidate.weight_kg,
      price_vs_30d_low: price === null ? null : 1 + price.pct_above_low,
      ...Object.fromEntries(
        weightedFeatures.map((name) => [featureMetric(name), features.includes(name) ? 1 : 0]),
      ),
    }),
    systemNotes: [cpu?.note, gpu?.note].flatMap((note) => (note === undefined ? [] : [note])),
  };
}
