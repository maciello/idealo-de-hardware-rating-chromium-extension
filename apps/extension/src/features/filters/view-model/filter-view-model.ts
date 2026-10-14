import {
  describeQuery,
  type FilterCatalog,
  type FilterId,
  type IdealoQuery,
  KNOWN_SORT_KEYS,
  type Requirements,
  type RequirementsPlan,
} from "@idealo-hw/idealo-query";
import { formatInteger } from "../../../ui/format";
import type { RequirementsSectionProps } from "../../requirements";
import { FILTERS_COPY, SORT_LABELS } from "../copy";
import type { RequirementsContext } from "../model";
import { type PanelNote, panelNote } from "./status";

export interface FilterViewInput {
  query: IdealoQuery;
  /** The query the page was showing when the panel opened; "Open" stays off until the url differs. */
  startQuery: IdealoQuery;
  catalog: FilterCatalog | null;
  /** True once the catalog read finished, whatever it found. */
  loaded: boolean;
  canFilter: boolean;
  shownText: string;
  search: string;
  requirements: Requirements;
  context: RequirementsContext;
  plan: RequirementsPlan | null;
  urlOf: (query: IdealoQuery) => string;
}

interface SortOption {
  value: string;
  label: string;
}

type FilterGroupView = FilterCatalog["groups"][number];

export interface FilterViewModel {
  text: string;
  note: PanelNote | null;
  /** Null when the requirement controls do not apply (no category, no catalog yet). */
  requirements: Omit<RequirementsSectionProps, "onChange" | "onPriceChange"> | null;
  /** The price inputs show when the requirement slider does not cover the price. */
  priceInputs: { price: IdealoQuery["price"] } | null;
  sort: { value: string; options: readonly SortOption[] };
  picker: {
    /** False when the category lists no filters, so the picker is left out. */
    available: boolean;
    search: string;
    groups: readonly FilterGroupView[];
    selected: ReadonlySet<FilterId>;
  };
  summary: string;
  url: string;
  applyDisabled: boolean;
  /** Estimated hits of the planned query; null when there is no plan or no estimate. */
  hits: string | null;
}

const sortOptionsOf = (query: IdealoQuery): SortOption[] => [
  { value: "", label: FILTERS_COPY.defaultOrder },
  ...[
    ...KNOWN_SORT_KEYS,
    ...(query.sort && !KNOWN_SORT_KEYS.some((k) => k === query.sort) ? [query.sort] : []),
  ].map((key) => ({ value: key, label: SORT_LABELS[key] ?? key })),
];

const groupsMatching = (
  groups: readonly FilterGroupView[],
  search: string,
): readonly FilterGroupView[] => {
  const needle = search.trim().toLowerCase();
  return groups
    .map((group) => ({
      ...group,
      filters: group.filters.filter((f) => f.label.toLowerCase().includes(needle)),
    }))
    .filter((group) => group.filters.length > 0);
};

/** Everything the panel shows, derived from the editing state. Pure. */
export function buildFilterViewModel(input: FilterViewInput): FilterViewModel {
  const { query, catalog, plan, context, canFilter } = input;
  const effectiveCatalog: FilterCatalog = catalog ?? {
    categoryId: query.categoryId,
    groups: [],
    manufacturers: [],
  };
  const effectiveQuery = plan?.query ?? query;
  const url = input.urlOf(effectiveQuery);
  const sliderPrice = canFilter && context.priceBounds !== null;
  return {
    text: input.shownText,
    note: panelNote(canFilter, input.loaded, catalog),
    requirements:
      canFilter && catalog !== null
        ? {
            catalog,
            requirements: input.requirements,
            plan,
            scorer: context.scorer,
            hasData: context.hasData,
            priceBounds: context.priceBounds,
            pagePrice: query.price,
          }
        : null,
    priceInputs: sliderPrice ? null : { price: query.price },
    sort: { value: query.sort ?? "", options: sortOptionsOf(query) },
    picker: {
      available: effectiveCatalog.groups.length > 0,
      search: input.search,
      groups: groupsMatching(effectiveCatalog.groups, input.search),
      selected: new Set(query.filterIds),
    },
    summary: describeQuery(effectiveQuery, effectiveCatalog).summary,
    url,
    applyDisabled: url === input.urlOf(input.startQuery) || url === "",
    hits:
      plan?.hitsUpperBound != null ? FILTERS_COPY.hits(formatInteger(plan.hitsUpperBound)) : null,
  };
}
