/** Display names for sort keys; a key without one is shown as is. */
export const SORT_LABELS: Readonly<Record<string, string>> = { minPrice: "Lowest price first" };

export const FILTERS_COPY = {
  title: "Filter builder",
  fabAria: "Open filter builder",

  textLabel: "Search text",
  textPlaceholder: "For example: laptop 32GB",

  noCategoryNote:
    "This search page does not name a category, so hardware filters cannot be applied here. Text, price and sort still work.",
  noCatalogNote:
    "Filters could not be read from this page. Text, price and sort still work. A page snapshot would help to read them: save one from the extension popup and share it.",

  priceMinLabel: "Min price (EUR)",
  priceMaxLabel: "Max price (EUR)",
  priceInverted: "Min is above max",

  sortLabel: "Sort",
  defaultOrder: "Default order",

  pickerTitle: "Pick filters by name",
  pickerSearch: "Search filters",
  detailsTitle: "Selection and link",

  /** The lines of the selection summary under "Selection and link". */
  summary: {
    category: (id: string): string => `Category ${id}`,
    group: (name: string, labels: string): string => `${name}: ${labels}`,
    manufacturer: (names: string): string => `Manufacturer: ${names}`,
    unknownFilters: (ids: string): string => `Unknown filter ids: ${ids}`,
    unknownManufacturers: (ids: string): string => `Unknown manufacturer ids: ${ids}`,
    price: (range: string): string => `Price: ${range}`,
    priceBetween: (min: number, max: number): string => `${min}-${max} EUR`,
    priceFrom: (min: number): string => `from ${min} EUR`,
    priceUpTo: (max: number | undefined): string => `up to ${max} EUR`,
    sort: (key: string): string => `Sort: ${key}`,
    text: (text: string): string => `Search text: ${text}`,
    offset: (offset: number): string => `Result offset: ${offset}`,
    listSeparator: ", ",
    lineSeparator: "\n",
  },

  settingsAria: "Open settings",
  reset: "Reset",
  open: "Open",
  hits: (count: string): string => `≤ ${count} products`,
} as const;
