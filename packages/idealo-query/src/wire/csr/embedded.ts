import { type CategoryId, CategoryIdSchema } from "../../ids";

export interface EmbeddedSearchResult {
  readonly categoryId: CategoryId;
  /** Raw module payload; pass to parseSearchResult. */
  readonly json: unknown;
}

/** Text that marks an inline script as carrying the embedded search result. */
export const EMBEDDED_SEARCH_RESULT_MARKER = "window.csr.initialData['searchResult']";

const EMBEDDED_PAYLOAD = /window\.csr\.initialData\['searchResult'\]\s*=\s*"([A-Za-z0-9+/=]+)"/;
const EMBEDDED_CATEGORY = /window\.csr\.initialData\['categoryId'\]\s*=\s*"(\d+)"/;

const decodeBase64Utf8 = (base64: string): string =>
  new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));

/**
 * Reads the searchResult payload that listing pages inline as base64 in
 * `window.csr.initialData['searchResult']`. `source` is the text of the inline script (or the whole
 * document HTML). Returns null when the page carries no such payload; throws on a malformed one.
 */
export function readEmbeddedSearchResult(source: string): EmbeddedSearchResult | null {
  const payload = EMBEDDED_PAYLOAD.exec(source)?.[1];
  const category = EMBEDDED_CATEGORY.exec(source)?.[1];
  if (payload === undefined || category === undefined) return null;
  return {
    categoryId: CategoryIdSchema.parse(category),
    json: JSON.parse(decodeBase64Utf8(payload)),
  };
}
