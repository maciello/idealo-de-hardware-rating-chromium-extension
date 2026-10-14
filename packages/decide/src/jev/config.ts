/**
 * Pinned: thresholds are calibrated per model version, so never `jev-latest`. OpenRouter maps the bare id
 * "jev-1.13" to this one and answers with the dated snapshot it served (e.g. "typesafe/jev-1.13-20260917").
 */
export const DEFAULT_JEV_MODEL = "typesafe/jev-1.13";
/**
 * OpenRouter root. The SDK appends "/v1/systemone", giving POST https://openrouter.ai/api/v1/systemone,
 * which is wire-compatible with api.typesafe.ai.
 */
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api";
export const DEFAULT_THRESHOLD = 0.7;
/** Jev choice questions hold 255 options; one is `none_of_the_above`. */
export const MAX_CHOICE_CANDIDATES = 254;
/** OpenRouter serves Jev 1.13 with a 32k context (TypeSafe direct: 64k); leave headroom for the rough estimate. */
export const DEFAULT_MAX_REQUEST_TOKENS = 24_000;
/** Jev 1.13 limit for the state plus the single longest question. */
export const MAX_STATE_AND_QUESTION_TOKENS = 32_000;
