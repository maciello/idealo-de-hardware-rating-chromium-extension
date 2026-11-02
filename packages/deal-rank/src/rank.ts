import { annotate } from "./annotate";
import type { BenchmarkLookup } from "./benchmark";
import type { Candidate } from "./candidate";
import { type Evaluated, evaluate, featureMetric } from "./evaluate";
import { rareFeatures } from "./features";
import { applyHardFilters, type FilterOutcome } from "./filters";
import { lensView } from "./lenses";
import { type MetricDef, metricDefs } from "./metrics";
import { poolCandidates } from "./pool";
import type { DealReport, ExcludedCandidate, RankedCandidate } from "./report";
import { scoreCandidates } from "./score";
import { findStandouts } from "./standouts";
import type { Wants } from "./wants";

interface Judged {
  item: Evaluated;
  outcome: FilterOutcome;
}

const excludedOf = ({ item, outcome }: Judged): ExcludedCandidate => ({
  sku: item.candidate.sku,
  name: item.candidate.name,
  url: item.candidate.url,
  reasons: outcome.reasons,
});

/** Built-in and custom metrics for standouts; weighted features join the score as 0/1 metrics. */
function scoringSetup(wants: Wants) {
  const defs = metricDefs(wants.custom_metrics);
  const features = Object.keys(wants.feature_weights);
  const featureDefs: MetricDef[] = features.map((name) => ({
    key: featureMetric(name),
    lower: false,
  }));
  const weights = {
    ...wants.weights,
    ...Object.fromEntries(
      features.map((name) => [featureMetric(name), wants.feature_weights[name] ?? 0]),
    ),
  };
  return { defs, scoreDefs: [...defs, ...featureDefs], weights, features };
}

/**
 * Pools, enriches, filters, scores and annotates the candidates. Pure: the same entries, wants and lookup
 * always give the same report.
 */
export function rankDeals(
  entries: readonly Candidate[],
  wants: Wants,
  lookup: BenchmarkLookup,
): DealReport {
  const setup = scoringSetup(wants);
  const pooled = poolCandidates(entries);
  const judged = pooled
    .map((candidate) => evaluate(candidate, lookup, setup.features))
    .map((item): Judged => ({ item, outcome: applyHardFilters(item, wants) }));
  const eligible = judged.filter(({ outcome }) => outcome.reasons.length === 0);
  const items = eligible.map(({ item }) => item);
  const scored = scoreCandidates(items, setup.scoreDefs, setup.weights);
  const unverified = new Map(
    eligible.map(({ item, outcome }) => [item.candidate.sku, outcome.unverified]),
  );
  const standouts = findStandouts(items, setup.defs);
  const rare = rareFeatures(
    items.map((item) => ({ sku: item.candidate.sku, features: item.features })),
  );
  const known = new Set(wants.lenses.map((lens) => lens.id));

  const ranked = scored.map((entry, index): RankedCandidate => {
    const { sku } = entry.item.candidate;
    return annotate(entry, index + 1, {
      standouts: standouts.get(sku) ?? [],
      rare: rare.get(sku) ?? [],
      unverified: unverified.get(sku) ?? [],
    });
  });
  return {
    summary: {
      candidates: pooled.length,
      eligible: ranked.length,
      excluded: pooled.length - ranked.length,
      lenses: wants.lenses.length,
    },
    top_n: wants.top_n,
    ranked,
    excluded: judged.filter(({ outcome }) => outcome.reasons.length > 0).map(excludedOf),
    lens_view: lensView(wants.lenses, pooled, scored),
    unknown_lens_ids: [
      ...new Set(pooled.flatMap((c) => c.found_by).filter((id) => !known.has(id))),
    ],
    weighted_metrics: setup.scoreDefs
      .map(({ key }) => key)
      .filter((key) => (setup.weights[key] ?? 0) > 0),
    custom_metrics: wants.custom_metrics,
  };
}
