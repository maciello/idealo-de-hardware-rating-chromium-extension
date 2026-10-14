export const ASSUMPTIONS = {
  "url.suffix-boundary":
    "ProductCategory segment is <cat>[F<id>(-<id>)*][I16-<offset>][<suffix>]; the opaque suffix starts at the first letter after the last digit run (after ids or offset), matches [A-Za-z][A-Za-z0-9]*, never starts with F<digit>. Meaning of the suffix is unknown; it is preserved verbatim.",
  "url.paging-grammar":
    "Paging is the literal token I16- followed by a decimal offset, placed after the F-ids and before the opaque suffix: <cat>F<ids>I16-<offset>. Combination with F-ids is a hypothesis; I16 is assumed constant. Offset 0 is the first page and is omitted.",
  "url.filter-ids": "Filter-value ids follow the category id after a literal 'F', joined by '-'.",
  "url.price-param":
    "p=<min>-<max> with decimals; integers are written with one decimal (0.0); fractional values with up to 2 decimals unpadded; an open end is written p=<min>- or p=-<max>.",
  "url.sort-values":
    "sortKey is an open string; only minPrice is known. Unknown sort keys round-trip untouched.",
  "url.text-param":
    "q on a ProductCategory URL is free text; qd and every other unknown or tracking parameter (msockid, ...) is dropped and reported in ignoredParams.",
  "url.param-order": "Canonical query-param order is p, q, sortKey. Order carries no meaning.",
  "url.hosts":
    "Any idealo.<tld> host (or relative URL) is accepted; category ids are country-specific.",
  "url.product":
    "Product page path is /preisvergleich/OffersOfProduct/<digits>[_<slug>].html; slug is everything after the first underscore.",
  "url.search": "Search page is /preisvergleich/MainSearchProductCategory.html?q=<text>.",
  "mcp.H1": "Web F-ids equal MCP filterIds (ADR 0009 H1).",
  "mcp.H2":
    "A manufacturer's searchFilterId in the MCP response is its web F-id, so manufacturers are expressed in web URLs as filter ids via the catalog.",
  "mcp.H3":
    "Every filterId is sent as includeSearchFilters; includeSizeFilters is never produced because the size/search split is unknown.",
  "mcp.price-rounding":
    "MCP prices are whole EUR: minPrice is floored and maxPrice ceiled so the MCP range is a superset of the web range.",
  "mcp.response-shape":
    "availableFilters and availableManufacturers sit at the root of the response object; ids may arrive as strings or integers; the response does not carry the category id.",
  "csr.search-result":
    "GET /csr/api/v2/modules/searchResult?categoryId&locale=de_DE[&pageIndex][&query] returns items, filterGroups, selectedFilters and metadata (HAR 2026-10-14). Server-rendered listing pages do not call it but inline the same payload as base64 in window.csr.initialData['searchResult'], next to initialData['categoryId'] (5 categories).",
  "csr.filter-ids":
    "filterGroups[].filters[].id is the web F-id: filters=953430 maps to ProductCategory/3020F953430.html via /mvc/metadata browserUrl (HAR 2026-10-14). Multi-filter encoding is unobserved.",
  "csr.manufacturer-group":
    "Manufacturers arrive as filter group id 'manufacturer' whose filter ids work in filters=; they carry no manufacturerId, so catalog.manufacturers stays empty.",
} as const;

export type AssumptionId = keyof typeof ASSUMPTIONS;
