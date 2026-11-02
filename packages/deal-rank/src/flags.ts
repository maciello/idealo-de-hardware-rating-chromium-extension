import type { Evaluated } from "./evaluate";

export type FlagParam = number | string | boolean | null;

/** A typed red flag: the consumer words it. Ids for agent flags and unverified checks pass through. */
export interface RedFlag {
  id: string;
  params: Record<string, FlagParam>;
}

const LOW_RES_WEBCAM_MP = 2;
const DIM_DISPLAY_NITS = 350;
const SMALL_SSD_GB = 1000;
const SMALL_BATTERY_WH = 50;
const LOW_TRUST_RATING = 4.0;
const LOW_TRUST_COUNT = 50;
const FEW_SAMPLES = 30;
const NEW_LISTING_MONTHS = 2;
const ABOVE_LOW_PCT = 0.1;

const flag = (id: string, params: Record<string, FlagParam> = {}): RedFlag => ({ id, params });

const monthIndex = (text: string): number | null => {
  const match = /^(\d{4})-(\d{2})/.exec(text);
  return match?.[1] === undefined || match[2] === undefined
    ? null
    : Number(match[1]) * 12 + Number(match[2]);
};

const isNewAndUntested = (item: Evaluated): boolean => {
  const { listed_since: since, fetched_at: fetched, test_grade: grade } = item.candidate;
  if (since === null || grade !== null) return false;
  const listed = monthIndex(since);
  const now = monthIndex(fetched);
  return listed !== null && now !== null && now - listed <= NEW_LISTING_MONTHS;
};

function hardwareFlags(item: Evaluated): RedFlag[] {
  const { candidate } = item;
  const nits = candidate.display.nits;
  const out: RedFlag[] = [];
  if (item.webcamMp !== null && item.webcamMp < LOW_RES_WEBCAM_MP) {
    out.push(flag("low_res_webcam", { megapixels: item.webcamMp }));
  }
  if (nits !== null && nits < DIM_DISPLAY_NITS) out.push(flag("dim_display", { nits }));
  if (candidate.ssd_gb !== null && candidate.ssd_gb < SMALL_SSD_GB) {
    out.push(flag("small_ssd", { gb: candidate.ssd_gb }));
  }
  if (candidate.battery_wh !== null && candidate.battery_wh < SMALL_BATTERY_WH) {
    out.push(flag("small_battery", { wh: candidate.battery_wh }));
  }
  return out;
}

function offerFlags(item: Evaluated): RedFlag[] {
  const { best, trusted } = item;
  const out: RedFlag[] = [];
  if (best.marketplace) out.push(flag("marketplace_offer", { shop: best.shop }));
  if (!best.payments.includes("INV") && !best.payments.includes("CBC")) {
    out.push(flag("limited_payment", { payments: best.payments.join(", ") }));
  }
  const lowRating = best.rating_avg === null || best.rating_avg < LOW_TRUST_RATING;
  const fewRatings = best.rating_count === null || best.rating_count < LOW_TRUST_COUNT;
  if (lowRating || fewRatings) {
    out.push(
      flag("low_trust_shop", {
        shop: best.shop,
        rating_avg: best.rating_avg,
        rating_count: best.rating_count,
      }),
    );
  }
  if (item.candidate.offers.length === 1) out.push(flag("single_offer"));
  if (trusted !== null && trusted.total_eur > best.total_eur) {
    out.push(
      flag("trusted_offer_premium", {
        delta: Math.round((trusted.total_eur - best.total_eur) * 100) / 100,
        shop: trusted.shop,
      }),
    );
  }
  return out;
}

function dataFlags(item: Evaluated): RedFlag[] {
  const { candidate, cpu, gpu } = item;
  const out: RedFlag[] = [];
  const samples = [cpu?.samples, gpu?.samples].flatMap((n) => n ?? []);
  if (samples.some((n) => n < FEW_SAMPLES)) {
    out.push(
      flag("few_benchmark_samples", {
        cpu_samples: cpu?.samples ?? null,
        gpu_samples: gpu?.samples ?? null,
      }),
    );
  }
  if (cpu === null && candidate.cpu !== null) {
    out.push(flag("no_cpu_benchmark", { cpu: candidate.cpu }));
  }
  if (gpu === null && candidate.gpu !== null) {
    out.push(flag("no_gpu_benchmark", { gpu: candidate.gpu }));
  }
  if (isNewAndUntested(item))
    out.push(flag("new_untested", { listed_since: candidate.listed_since }));
  return out;
}

function priceFlags(item: Evaluated): RedFlag[] {
  const { price, candidate } = item;
  if (price === null) return [];
  const out: RedFlag[] = [];
  if (price.pct_above_low >= ABOVE_LOW_PCT) {
    out.push(flag("above_30d_low", { pct_above_low: price.pct_above_low }));
  }
  if (price.badge_inflated) {
    out.push(
      flag("badge_inflated", {
        bargain_badge_pct: candidate.bargain_badge_pct,
        pct_above_low: price.pct_above_low,
      }),
    );
  }
  return out;
}

/** Every red flag for a candidate: hardware, offer, data, price, unverified checks, then the agent's own flags. */
export function redFlags(item: Evaluated, unverified: readonly string[]): RedFlag[] {
  return [
    ...hardwareFlags(item),
    ...offerFlags(item),
    ...dataFlags(item),
    ...priceFlags(item),
    ...unverified.map((check) => flag(`unverified_${check}`)),
    ...item.candidate.agent_flags.map((id) => flag(id)),
  ];
}
