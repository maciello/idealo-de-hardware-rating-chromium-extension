import type { Evaluated } from "./evaluate";
import type { MetricDef } from "./metrics";

export interface Contribution {
  metric: string;
  weight: number;
  /** The candidate's value, null when it has none (scored 0). */
  value: number | null;
  /** 0..1 after min-max over the eligible set; inverted for lower-is-better metrics. */
  normalised: number;
  /** This metric's share of the 0..100 score. */
  points: number;
}

export interface Scored {
  item: Evaluated;
  score: number;
  contributions: Contribution[];
  /** `missing:<metric>` for every weighted metric the candidate has no value for. */
  notes: string[];
}

interface Range {
  min: number;
  max: number;
}

const round = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const rangeOf = (items: readonly Evaluated[], metric: string): Range | null => {
  const values = items.flatMap((item) => item.metrics[metric] ?? []);
  return values.length === 0 ? null : { min: Math.min(...values), max: Math.max(...values) };
};

function normalise(lower: boolean, value: number, range: Range): number {
  if (range.max === range.min) return 1;
  const share = (value - range.min) / (range.max - range.min);
  return lower ? 1 - share : share;
}

/** Lower price first, then sku, so equal scores always sort the same way. */
const byScore = (a: Scored, b: Scored): number =>
  b.score - a.score ||
  a.item.best.total_eur - b.item.best.total_eur ||
  a.item.candidate.sku.localeCompare(b.item.candidate.sku);

/**
 * Scores the eligible set: 100 x sum(weight x normalised) / sum(weight). A missing value scores 0 and adds a
 * note. Sorted best first.
 */
export function scoreCandidates(
  items: readonly Evaluated[],
  defs: readonly MetricDef[],
  weights: Readonly<Record<string, number>>,
): Scored[] {
  const weighted = defs.filter(({ key }) => (weights[key] ?? 0) > 0);
  const total = weighted.reduce((sum, { key }) => sum + (weights[key] ?? 0), 0);
  const ranges = new Map(weighted.map(({ key }) => [key, rangeOf(items, key)]));
  return items
    .map((item): Scored => {
      const contributions = weighted.map(({ key: metric, lower }): Contribution => {
        const weight = weights[metric] ?? 0;
        const value = item.metrics[metric] ?? null;
        const range = ranges.get(metric) ?? null;
        const normalised = value === null || range === null ? 0 : normalise(lower, value, range);
        return { metric, weight, value, normalised, points: (100 * weight * normalised) / total };
      });
      return {
        item,
        score: contributions.reduce((sum, c) => sum + c.points, 0),
        contributions: contributions.map((c) => ({
          ...c,
          normalised: round(c.normalised, 4),
          points: round(c.points, 2),
        })),
        notes: contributions.flatMap((c) => (c.value === null ? [`missing:${c.metric}`] : [])),
      };
    })
    .sort(byScore)
    .map((scored) => ({ ...scored, score: round(scored.score, 2) }));
}
