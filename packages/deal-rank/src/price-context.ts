import { median } from "simple-statistics";

const FLAT_RANGE = 0.01;
const FALLING_FACTOR = 0.97;
const RISING_FACTOR = 1.03;
const DIP_FACTOR = 0.9;
const BADGE_INFLATED_FACTOR = 1.03;

export type PriceTrend = "flat" | "falling" | "rising" | "mixed";

export interface PriceDip {
  index: number;
  value: number;
}

export interface PriceContext {
  low: number;
  high: number;
  median: number;
  last: number;
  points: number;
  pct_above_low: number;
  trend: PriceTrend;
  dips: PriceDip[];
  badge_inflated: boolean;
}

export interface PriceInput {
  historyCents: readonly number[];
  bestPriceEur: number;
  bargainBadgePct: number | null;
}

const trendOf = (low: number, high: number, last: number, mid: number): PriceTrend => {
  if ((high - low) / low <= FLAT_RANGE) return "flat";
  if (last <= mid * FALLING_FACTOR) return "falling";
  if (last >= mid * RISING_FACTOR) return "rising";
  return "mixed";
};

/** 30-day price context from idealo's history (cents, oldest first). Null when the history is empty. */
export function priceContext(input: PriceInput): PriceContext | null {
  const euros = input.historyCents.filter((cents) => cents > 0).map((cents) => cents / 100);
  const last = euros.at(-1);
  if (last === undefined) return null;
  const low = Math.min(...euros);
  const high = Math.max(...euros);
  const mid = median(euros);
  return {
    low,
    high,
    median: mid,
    last,
    points: euros.length,
    pct_above_low: input.bestPriceEur / low - 1,
    trend: trendOf(low, high, last, mid),
    dips: euros.flatMap((value, index) => (value <= mid * DIP_FACTOR ? [{ index, value }] : [])),
    badge_inflated:
      input.bargainBadgePct !== null && input.bestPriceEur >= low * BADGE_INFLATED_FACTOR,
  };
}
