export { ASSUMPTIONS, type AssumptionId } from "./assumptions";
export {
  type CatalogIndex,
  type FilterCatalog,
  FilterCatalogSchema,
  type FilterGroup,
  type FilterLookup,
  type FilterOption,
  indexCatalog,
  type Manufacturer,
  parseMcpSearchResponseCatalog,
} from "./catalog";
export {
  allAtLeast,
  allAtMost,
  type Facet,
  type FacetGroup,
  type FacetOption,
  facetsOf,
  type Interval,
  type LabelFacet,
  type ModelFacet,
  type NumericFacet,
} from "./facets";
export {
  type CategoryId,
  categoryId,
  type FilterId,
  filterId,
  type ManufacturerId,
  manufacturerId,
} from "./ids";
export { type McpCountry, type McpSearchArgs, toMcpSearchArgs } from "./mcp";
export {
  emptyQuery,
  type IdealoQuery,
  IdealoQuerySchema,
  KNOWN_SORT_KEYS,
  normalizeQuery,
  type PriceRange,
  type SortKey,
} from "./model";
export {
  type EmbeddedSearchResult,
  type ListingItem,
  type ListingItemKind,
  parseSearchResult,
  readEmbeddedSearchResult,
  SEARCH_RESULT_PATH,
  type SearchResultPage,
} from "./search-result";
export {
  addFilters,
  addManufacturers,
  clearGroup,
  describeQuery,
  foldManufacturers,
  type QueryDescription,
  removeFilters,
  removeManufacturers,
  resetPaging,
  setOffset,
  setPrice,
  setSort,
  setText,
  toggleFilter,
} from "./select";
export {
  DEFAULT_ORIGIN,
  type ParsedIdealoUrl,
  parseIdealoUrl,
  toWebUrl,
  UnrepresentableQueryError,
} from "./url";
