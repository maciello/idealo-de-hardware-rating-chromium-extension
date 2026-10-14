import { embeddedListing } from "@idealo-hw/idealo-page";
import {
  addFilters,
  type CategoryId,
  categoryId,
  emptyQuery,
  type IdealoQuery,
  parseIdealoUrl,
  toWebUrl,
} from "@idealo-hw/idealo-query";

/** How the filter builder behaves on the current page. */
export interface FilterPage {
  kind: "category" | "search";
  query: IdealoQuery;
  /** Url that applies `query`; may throw for queries the url grammar cannot express. */
  toUrl(query: IdealoQuery): string;
  /** False on a search page that names no category: only text, price and sort apply. */
  canFilter: boolean;
}

/** The category most links on the page point to (ties: first seen); null when there are none. */
export function guessCategoryId(doc: ParentNode): CategoryId | null {
  const counts = new Map<CategoryId, number>();
  for (const anchor of doc.querySelectorAll("a[href]")) {
    const parsed = parseIdealoUrl(anchor.getAttribute("href") ?? "");
    if (parsed.kind === "category") {
      const id = parsed.query.categoryId;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  let best: CategoryId | null = null;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}

const PLACEHOLDER_CATEGORY = categoryId("0");
const SEARCH_PATH = "/preisvergleich/MainSearchProductCategory.html";

/** Search-page url from the text, price and sort of a query (filters and category are dropped). */
export function toSearchUrl(query: IdealoQuery): string {
  const url = new URL(toWebUrl({ ...emptyQuery(PLACEHOLDER_CATEGORY), ...pick(query) }));
  url.pathname = SEARCH_PATH;
  return url.toString();
}

const pick = ({ text, price, sort }: IdealoQuery): Partial<IdealoQuery> => ({
  ...(text === undefined ? {} : { text }),
  ...(price === undefined ? {} : { price }),
  ...(sort === undefined ? {} : { sort }),
});

/**
 * Category and search pages get a filter builder; everything else gets none. A search page that
 * still shows the page as served names its category and active filters in the embedded payload;
 * after a client-side navigation the payload is stale and only the page's links are consulted.
 */
export function filterPageOf(url: string, doc: Document): FilterPage | null {
  const parsed = parseIdealoUrl(url);
  if (parsed.kind === "category") {
    return { kind: "category", query: parsed.query, toUrl: (q) => toWebUrl(q), canFilter: true };
  }
  if (parsed.kind !== "search") return null;
  const carried: Partial<IdealoQuery> = {
    text: parsed.text,
    ...(parsed.price ? { price: parsed.price } : {}),
    ...(parsed.sort ? { sort: parsed.sort } : {}),
  };
  const embedded = embeddedListing(doc);
  const served = embedded?.url === url ? embedded : null;
  const guessed = served?.categoryId ?? guessCategoryId(doc);
  if (guessed !== null) {
    const base = { ...emptyQuery(guessed), ...carried };
    return {
      kind: "search",
      query: served === null ? base : addFilters(base, served.page.selected),
      toUrl: (q) => toWebUrl(q),
      canFilter: true,
    };
  }
  return {
    kind: "search",
    query: { ...emptyQuery(PLACEHOLDER_CATEGORY), ...carried },
    toUrl: toSearchUrl,
    canFilter: false,
  };
}
