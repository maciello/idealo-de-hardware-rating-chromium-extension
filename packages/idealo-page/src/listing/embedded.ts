import {
  type CategoryId,
  EMBEDDED_SEARCH_RESULT_MARKER,
  parseSearchResult,
  readEmbeddedSearchResult,
  type SearchResultPage,
} from "@idealo-hw/idealo-query";

/** The search result idealo's server render inlines into every listing page. */
export interface EmbeddedListing {
  categoryId: CategoryId;
  page: SearchResultPage;
  /** Document url when the payload was read; it differs from the live url after a client-side navigation. */
  url: string;
}

export interface EmbeddedStatus {
  listing: EmbeddedListing | null;
  /** Why a payload that is present could not be read; null when absent or fine. */
  error: string | null;
}

const cache = new WeakMap<Document, EmbeddedStatus>();

function scan(doc: Document): EmbeddedListing | null {
  for (const script of doc.scripts) {
    const source = script.textContent ?? "";
    if (!source.includes(EMBEDDED_SEARCH_RESULT_MARKER)) continue;
    const embedded = readEmbeddedSearchResult(source);
    if (embedded === null) continue;
    return {
      categoryId: embedded.categoryId,
      page: parseSearchResult(embedded.json, embedded.categoryId),
      url: doc.URL,
    };
  }
  return null;
}

/**
 * Parsed once per document. The payload describes the page as served: after a client-side
 * navigation it is stale, so callers must only trust it for item ids it lists. A missing payload
 * yields a null listing; a malformed one also says why.
 */
export function embeddedStatus(doc: Document): EmbeddedStatus {
  const cached = cache.get(doc);
  if (cached) return cached;
  let status: EmbeddedStatus;
  try {
    status = { listing: scan(doc), error: null };
  } catch (error) {
    status = { listing: null, error: error instanceof Error ? error.message : String(error) };
  }
  // While the document is still loading the script may not have been parsed yet.
  if (status.listing !== null || status.error !== null || doc.readyState !== "loading") {
    cache.set(doc, status);
  }
  return status;
}

export const embeddedListing = (doc: Document): EmbeddedListing | null =>
  embeddedStatus(doc).listing;
