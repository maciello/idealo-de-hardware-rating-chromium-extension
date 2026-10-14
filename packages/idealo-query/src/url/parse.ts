import {
  type IdealoQuery,
  IdealoQuerySchema,
  normalizeQuery,
  type PriceRange,
  type SortKey,
} from "../query";
import {
  CATEGORY_PATH,
  CATEGORY_SEGMENT,
  DEFAULT_ORIGIN,
  HOST,
  PRODUCT_PATH,
  SEARCH_PATH,
} from "./constants";

export type ParsedIdealoUrl =
  | { kind: "category"; query: IdealoQuery; ignoredParams: string[] }
  | {
      kind: "search";
      text: string;
      price?: PriceRange;
      sort?: SortKey;
      ignoredParams: string[];
    }
  | { kind: "product"; productId: string; slug?: string }
  | { kind: "unknown" };

const UNKNOWN = { kind: "unknown" } as const;
const PRICE_PARAM = /^(\d+(?:\.\d+)?)?-(\d+(?:\.\d+)?)?$/;
const MAX_SAFE_PRICE = 1_000_000_000;

function parsePriceParam(value: string): PriceRange | undefined {
  const match = PRICE_PARAM.exec(value);
  if (!match || (match[1] === undefined && match[2] === undefined)) return undefined;
  const min = match[1] === undefined ? undefined : Number(match[1]);
  const max = match[2] === undefined ? undefined : Number(match[2]);
  if ((min ?? 0) > MAX_SAFE_PRICE || (max ?? 0) > MAX_SAFE_PRICE) return undefined;
  return {
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
  };
}

interface CommonParams {
  price: PriceRange | undefined;
  sort: SortKey | undefined;
  text: string | undefined;
  ignoredParams: string[];
}

function readParams(params: URLSearchParams): CommonParams {
  const out: CommonParams = {
    price: undefined,
    sort: undefined,
    text: undefined,
    ignoredParams: [],
  };
  const ignore = (name: string) => {
    if (!out.ignoredParams.includes(name)) out.ignoredParams.push(name);
  };
  const seen = new Set<string>();
  params.forEach((value, name) => {
    if (seen.has(name)) return;
    seen.add(name);
    if (name === "p") {
      out.price = parsePriceParam(value);
      if (!out.price) ignore(name);
    } else if (name === "q" && value.trim() !== "") out.text = value;
    else if (name === "sortKey" && value !== "") out.sort = value;
    else ignore(name);
  });
  return out;
}

function toURL(url: string | URL): URL | undefined {
  if (typeof url !== "string") return url;
  try {
    return new URL(url, DEFAULT_ORIGIN);
  } catch {
    return undefined;
  }
}

function parseCategory(segment: string, common: CommonParams): ParsedIdealoUrl {
  const match = CATEGORY_SEGMENT.exec(segment);
  if (!match) return UNKNOWN;
  const [, category, ids, offset, opaqueSuffix] = match;
  const parsed = IdealoQuerySchema.safeParse({
    categoryId: category,
    filterIds: ids ? ids.split("-") : [],
    manufacturerIds: [],
    ...(common.price ? { price: common.price } : {}),
    ...(common.sort ? { sort: common.sort } : {}),
    ...(offset ? { offset: Number(offset) } : {}),
    ...(common.text ? { text: common.text } : {}),
    ...(opaqueSuffix ? { opaqueSuffix } : {}),
  });
  if (!parsed.success) return UNKNOWN;
  return {
    kind: "category",
    query: normalizeQuery(parsed.data),
    ignoredParams: common.ignoredParams,
  };
}

/** Never throws; anything not recognised is `{ kind: "unknown" }`. */
export function parseIdealoUrl(url: string | URL): ParsedIdealoUrl {
  const parsed = toURL(url);
  if (!parsed || !HOST.test(parsed.hostname)) return UNKNOWN;
  const path = parsed.pathname;

  const category = CATEGORY_PATH.exec(path);
  if (category?.[1]) return parseCategory(category[1], readParams(parsed.searchParams));

  const product = PRODUCT_PATH.exec(path);
  if (product?.[1]) {
    return {
      kind: "product",
      productId: product[1],
      ...(product[2] ? { slug: product[2] } : {}),
    };
  }

  if (SEARCH_PATH.test(path)) {
    const common = readParams(parsed.searchParams);
    if (!common.text) return UNKNOWN;
    return {
      kind: "search",
      text: common.text,
      ...(common.price ? { price: common.price } : {}),
      ...(common.sort ? { sort: common.sort } : {}),
      ignoredParams: common.ignoredParams,
    };
  }
  return UNKNOWN;
}
