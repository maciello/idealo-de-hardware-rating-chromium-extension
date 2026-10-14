import type { Rating } from "@idealo-hw/hw-bench";
import { POWER_SENSOR_ID, POWER_SIGNAL_IDS, type Signal } from "@idealo-hw/sensors";
import type { ItemRating, PageRank } from "./engine";

export const MULTI = "raw_multithread_score";
export const SINGLE = "single_thread_score";
export const PER_EURO = "value_per_euro";
export const PAGE_RANK = "peer_percentile_on_listing";
export const SEGMENT = "segment_percentile";

export const DEFAULT_PRIMARY_ID = MULTI;

/** The four numbers a user can pick as the chip's headline value. */
export const PRIMARY_CHOICES: readonly { id: string; label: string }[] = [
  { id: MULTI, label: "Multi" },
  { id: SINGLE, label: "Single" },
  { id: PER_EURO, label: "Per €" },
  { id: PAGE_RANK, label: "Page rank" },
];

/** Order of card rows; also the fallback order when the chosen primary number is unavailable. */
const ROW_ORDER = [MULTI, SINGLE, PER_EURO, PAGE_RANK] as const;
export const ROW_LABELS: Readonly<Record<string, string>> = {
  [MULTI]: "Multi-thread",
  [SINGLE]: "Single-thread",
  [PER_EURO]: "Per euro",
  [PAGE_RANK]: "On this page",
  [SEGMENT]: "In its segment",
};

type Matched = Extract<ItemRating, { status: "matched" }>;

const SEGMENTS = 5;
const NUMBER = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const DECIMAL = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const DATE = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** de-DE, so numbers read like idealo's prices next to them: 9.986 and 17,6. */
export const formatInteger = (value: number): string => NUMBER.format(value);
export const formatDecimal = (value: number): string => DECIMAL.format(value);

/** `14.10.2026`; null for a missing or unparsable timestamp. */
export function formatImportDate(iso: string | null): string | null {
  if (iso === null) return null;
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : DATE.format(new Date(time));
}

/** Filled segments of the 5-segment meter: ceil(percentile / 20), clamped. Null hides the meter. */
export function meterSegments(percentile: number | null | undefined): number | null {
  if (percentile === null || percentile === undefined || !Number.isFinite(percentile)) return null;
  return Math.min(SEGMENTS, Math.max(0, Math.ceil(percentile / 20)));
}

/** Percentile 77 (better than 77 percent) reads as "top 23%"; never "top 0%". */
export const topPercent = (percentile: number): number =>
  Math.min(100, Math.max(1, Math.round(100 - percentile)));

const SEGMENT_NOUN: Readonly<Record<string, string>> = {
  laptop: "laptop CPUs",
  desktop: "desktop CPUs",
  server: "server CPUs",
  mobile_embedded: "mobile CPUs",
};

/**
 * Same pick as hw-bench's segment_percentile: the page's device class when known, else the first
 * segment of the CPU's own PassMark record that is not "unknown".
 */
export function segmentNoun({
  record,
  formFactor,
}: Pick<Matched, "record" | "formFactor">): string {
  if (formFactor !== "unknown") return SEGMENT_NOUN[formFactor] ?? "CPUs";
  const segment = record.segments.find((s) => s !== "unknown");
  return (segment !== undefined && SEGMENT_NOUN[segment]) || "CPUs";
}

/** Short value text of a rating; falls back to the strategy's own display for unknown ids. */
export function valueText(rating: Rating, pageRank: PageRank | null): string {
  switch (rating.strategyId) {
    case MULTI:
    case SINGLE:
      return formatInteger(rating.value);
    case PER_EURO:
      return `${formatDecimal(rating.value)} /€`;
    case PAGE_RANK:
      return pageRank === null ? rating.display : `#${pageRank.rank} of ${pageRank.total}`;
    case SEGMENT:
      return `top ${topPercent(rating.value)}%`;
    default:
      return rating.display;
  }
}

const find = (rating: Matched, id: string): Rating | undefined =>
  rating.ratings.find((r) => r.strategyId === id);

interface MeterInfo {
  filled: number;
  context: string;
}

const segmentMeter = (rating: Matched): MeterInfo | null => {
  const segment = find(rating, SEGMENT);
  const filled = meterSegments(segment?.value);
  return segment && filled !== null
    ? { filled, context: `top ${topPercent(segment.value)}% of ${segmentNoun(rating)}` }
    : null;
};

const pageMeter = (rating: Matched): MeterInfo | null => {
  const page = find(rating, PAGE_RANK);
  const filled = meterSegments(page?.value);
  return page && filled !== null
    ? { filled, context: `top ${topPercent(page.value)}% on this page` }
    : null;
};

/** Segment percentile first, the on-page percentile when the former is unavailable. */
export const meterOf = (rating: Matched): MeterInfo | null =>
  segmentMeter(rating) ?? pageMeter(rating);

/** What the chip says when the item's memory is DDR4 or older; DDR5 and LPDDR5(X) are the baseline. */
export const OLD_MEMORY_HINT = "Older memory generation";

export interface PowerBadge {
  level: "low" | "high";
  /** Icon title and accessible name. */
  label: string;
}

const powerSignalOf = (rating: Matched): Signal | undefined =>
  rating.signals.find((s) => s.sensorId === POWER_SENSOR_ID);

const powerBadgeOf = (rating: Matched): PowerBadge | null => {
  const signal = powerSignalOf(rating);
  return signal
    ? { level: signal.id === POWER_SIGNAL_IDS.veryLow ? "low" : "high", label: signal.label }
    : null;
};

export interface ChipModel {
  filled: number | null;
  value: string;
  label: string;
  /** Memory type to flag next to the rating ("DDR4"); null for current memory or none stated. */
  memoryWarning: string | null;
  /** Power extreme to show as an icon; null for everything in between. */
  power: PowerBadge | null;
  /** Spoken summary for the button. */
  aria: string;
}

/** The chosen primary number, else the first available one; null when nothing can be shown. */
export function chipModel(rating: Matched, primaryId: string): ChipModel | null {
  const order = [primaryId, ...ROW_ORDER];
  const primary = order.map((id) => find(rating, id)).find((r) => r !== undefined);
  if (!primary) return null;
  const meter = meterOf(rating);
  const value = valueText(primary, rating.pageRank);
  const memoryWarning = rating.ramType?.outdated ? rating.ramType.label : null;
  const power = powerBadgeOf(rating);
  return {
    filled: meter?.filled ?? null,
    value,
    label: "CPU",
    memoryWarning,
    power,
    aria: `CPU rating ${ROW_LABELS[primary.strategyId] ?? primary.strategyId} ${value}${
      meter ? `, ${meter.context}` : ""
    }${memoryWarning ? `, ${memoryWarning}: ${OLD_MEMORY_HINT.toLowerCase()}` : ""}${
      power ? `, ${power.label.toLowerCase()}` : ""
    }. Show details`,
  };
}

export interface CardRow {
  id: string;
  label: string;
  value: string;
  /** Rating explanation, shown as the row's title attribute. */
  title: string;
  meter: { filled: number; text: string } | null;
}

/**
 * One row per enabled strategy that produced a rating. The segment percentile describes the
 * multi-thread score, so it rides on that row; without it, it gets a row of its own. The on-page
 * percentile only shows as a meter on the page-rank row when no segment percentile exists.
 */
export function cardRows(rating: Matched): CardRow[] {
  const segment = segmentMeter(rating);
  const rows: CardRow[] = [];
  for (const id of ROW_ORDER) {
    const r = find(rating, id);
    if (!r) continue;
    const meter =
      id === MULTI
        ? (segment ?? pageMeter(rating))
        : id === PAGE_RANK && !segment
          ? pageMeter(rating)
          : null;
    rows.push({
      id,
      label: ROW_LABELS[id] ?? id,
      value: valueText(r, rating.pageRank),
      title: r.explanation,
      meter: meter ? { filled: meter.filled, text: meter.context } : null,
    });
  }
  const segmentRating = find(rating, SEGMENT);
  if (segmentRating && !rows.some((row) => row.id === MULTI)) {
    rows.unshift({
      id: SEGMENT,
      label: ROW_LABELS[SEGMENT] ?? SEGMENT,
      value: valueText(segmentRating, null),
      title: segmentRating.explanation,
      meter: segment ? { filled: segment.filled, text: `of ${segmentNoun(rating)}` } : null,
    });
  }
  const power = powerSignalOf(rating);
  if (power) {
    rows.push({
      id: "power",
      label: power.label,
      value: power.detail,
      title: power.evidence.map((e) => `${e.field}: ${e.value}`).join(" · "),
      meter: null,
    });
  }
  return rows;
}
