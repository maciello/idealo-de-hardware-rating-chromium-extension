import { z } from "zod";
import type { FilterCatalog } from "../../catalog";
import { type CategoryId, type FilterId, FilterIdSchema } from "../../ids";
import { numericString } from "../numeric-string";

/**
 * idealo's client-side search module: GET /csr/api/v2/modules/searchResult (same origin, JSON).
 * The page calls it on pagination, sorting and filter changes; the server-rendered page embeds the
 * same payload (readEmbeddedSearchResult). Only fields this package reads are parsed (ADR 0008).
 */
export const SEARCH_RESULT_PATH = "/csr/api/v2/modules/searchResult";

const text = z.string().transform((s) => s.replace(/\s+/g, " ").trim());
const count = z.number().int().min(0);

const CsrFilterSchema = z.object({
  id: numericString.pipe(FilterIdSchema),
  name: text,
  hits: count.nullish(),
});

const CsrFilterGroupSchema = z.object({
  id: z.string().min(1),
  name: text,
  filters: z.array(CsrFilterSchema),
});

const CsrItemSchema = z.object({
  id: z.string().min(1),
  type: z.string(),
  title: text,
  href: z.string().nullish(),
  subheading: text.nullish(),
  characteristics: z.array(text).nullish(),
  rawPrice: z.number().nonnegative().nullish(),
  offerInfo: z.object({ offerCount: count.nullish(), usedOnly: z.boolean().nullish() }).nullish(),
});

const CsrResponseSchema = z.object({
  items: z.array(CsrItemSchema),
  filterGroups: z.array(CsrFilterGroupSchema).default([]),
  priceRanges: z
    .object({
      dynamicRange: z
        .object({ fromPrice: z.number().nonnegative(), toPrice: z.number().nonnegative() })
        .nullish(),
    })
    .nullish(),
  selectedFilters: z.array(z.object({ id: numericString.pipe(FilterIdSchema) })).default([]),
  metadata: z.object({ search: z.object({ resultCount: count.nullish() }).nullish() }).nullish(),
});

export type ListingItemKind = "product" | "offer" | "other";

export interface ListingItem {
  readonly kind: ListingItemKind;
  /** idealo product id for products; opaque offer hash for single offers. */
  readonly id: string;
  readonly title: string;
  /** Spec fragments as shown on the tile, e.g. "Intel Core Ultra 7 255U", "32 GB RAM". Empty for offers. */
  readonly characteristics: readonly string[];
  /** Cheapest price in EUR. */
  readonly priceEur: number | null;
  readonly offerCount: number | null;
  readonly usedOnly: boolean;
  /** Absolute product page URL; null for offers (their href is an opaque leadout token). */
  readonly url: string | null;
}

export interface SearchResultPage {
  readonly items: readonly ListingItem[];
  /** Filter groups with ids and hit counts for the current query; manufacturers arrive as group "manufacturer". */
  readonly catalog: FilterCatalog;
  /** Filters active for this result, in page order. */
  readonly selected: readonly FilterId[];
  /** Cheapest and dearest price (EUR) in the current result set, for a price slider's range. */
  readonly priceBounds: { readonly min: number; readonly max: number } | null;
  readonly resultCount: number | null;
}

const priceBounds = (
  range: { fromPrice: number; toPrice: number } | null | undefined,
): SearchResultPage["priceBounds"] =>
  range == null || range.toPrice < range.fromPrice
    ? null
    : { min: range.fromPrice, max: range.toPrice };

const KINDS: Readonly<Record<string, ListingItemKind>> = { PRODUCT: "product", OFFER: "offer" };

/** Throws ZodError on a response that lacks the parsed fields. The response has no reliable category id, so it is passed in. */
export function parseSearchResult(json: unknown, categoryId: CategoryId): SearchResultPage {
  const response = CsrResponseSchema.parse(json);
  return {
    items: response.items.map((item) => ({
      kind: KINDS[item.type] ?? "other",
      id: item.id,
      title: item.title,
      characteristics: item.characteristics ?? [],
      priceEur: item.rawPrice ?? null,
      offerCount: item.offerInfo?.offerCount ?? null,
      usedOnly: item.offerInfo?.usedOnly ?? false,
      url: item.href?.startsWith("https://") ? item.href : null,
    })),
    catalog: {
      categoryId,
      groups: response.filterGroups.map((group) => ({
        attributeId: group.id,
        name: group.name,
        filters: group.filters.map((f) => ({
          filterId: f.id,
          label: f.name,
          ...(f.hits == null ? {} : { count: f.hits }),
        })),
      })),
      manufacturers: [],
    },
    selected: response.selectedFilters.map((f) => f.id),
    priceBounds: priceBounds(response.priceRanges?.dynamicRange),
    resultCount: response.metadata?.search?.resultCount ?? null,
  };
}
