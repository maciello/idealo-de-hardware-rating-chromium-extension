import {
  type CategoryId,
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

const MARKER = "window.csr.initialData['searchResult']";

const cache = new WeakMap<Document, EmbeddedListing | null>();

function scan(doc: Document): EmbeddedListing | null {
  for (const script of doc.scripts) {
    const source = script.textContent ?? "";
    if (!source.includes(MARKER)) continue;
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
 * navigation it is stale, so callers must only trust it for item ids it lists. A missing or
 * malformed payload yields null.
 */
export function embeddedListing(doc: Document): EmbeddedListing | null {
  if (cache.has(doc)) return cache.get(doc) ?? null;
  let found: EmbeddedListing | null = null;
  try {
    found = scan(doc);
  } catch {
    found = null;
  }
  // While the document is still loading the script may not have been parsed yet.
  if (found !== null || doc.readyState !== "loading") cache.set(doc, found);
  return found;
}
