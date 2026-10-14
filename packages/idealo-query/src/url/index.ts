export { DEFAULT_ORIGIN, IDEALO_MATCH_PATTERNS, IDEALO_ORIGIN, SEARCH_PATHNAME } from "./constants";
export { isIdealoHost } from "./host";
export { type ParsedIdealoUrl, parseIdealoUrl } from "./parse";
export { toSearchUrl, toWebUrl, UnrepresentableQueryError } from "./serialize";
