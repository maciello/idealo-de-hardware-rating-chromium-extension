import type { Evaluated } from "./evaluate";
import type { MetricDef } from "./metrics";

export interface Standout {
  metric: string;
  value: number;
  /** The best value among the other eligible candidates. */
  runner_up: number;
}

/** Minimum lead over the runner-up, relative to the runner-up's value, for a value to count as a standout. */
const MIN_LEAD = 0.05;

/**
 * For every metric, the one eligible candidate with the best value, when at least two candidates have a value,
 * no other candidate shares the best value and the lead over the runner-up is at least MIN_LEAD.
 * Weights play no part. Keyed by sku.
 */
export function findStandouts(
  items: readonly Evaluated[],
  defs: readonly MetricDef[],
): Map<string, Standout[]> {
  const result = new Map<string, Standout[]>(items.map((item) => [item.candidate.sku, []]));
  for (const { key: metric, lower } of defs) {
    const withValue = items.flatMap((item) => {
      const value = item.metrics[metric];
      return value === undefined ? [] : [{ sku: item.candidate.sku, value }];
    });
    if (withValue.length < 2) continue;
    const better = lower ? (a: number, b: number) => a < b : (a: number, b: number) => a > b;
    const best = withValue.reduce(
      (top, next) => (better(next.value, top) ? next.value : top),
      withValue[0]?.value ?? 0,
    );
    const leaders = withValue.filter((entry) => entry.value === best);
    const others = withValue.filter((entry) => entry.value !== best);
    const leader = leaders[0];
    const first = others[0];
    if (leaders.length !== 1 || leader === undefined || first === undefined) continue;
    const runnerUp = others.reduce(
      (top, next) => (better(next.value, top) ? next.value : top),
      first.value,
    );
    if (Math.abs(best - runnerUp) < Math.abs(runnerUp) * MIN_LEAD) continue;
    result.get(leader.sku)?.push({ metric, value: best, runner_up: runnerUp });
  }
  return result;
}
