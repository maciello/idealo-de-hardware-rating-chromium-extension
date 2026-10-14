export const MULTI = "raw_multithread_score";
export const SINGLE = "single_thread_score";
export const PER_EURO = "value_per_euro";
export const PAGE_RANK = "peer_percentile_on_listing";
export const SEGMENT = "segment_percentile";

export const DEFAULT_PRIMARY_ID = MULTI;

/** Order of card rows; also the fallback order when the chosen primary number is unavailable. */
export const ROW_ORDER = [MULTI, SINGLE, PER_EURO, PAGE_RANK] as const;
