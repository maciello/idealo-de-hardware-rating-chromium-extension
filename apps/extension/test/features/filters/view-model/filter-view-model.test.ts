import {
  categoryId,
  emptyQuery,
  type FilterCatalog,
  filterId,
  type IdealoQuery,
  setSort,
  toggleFilter,
} from "@idealo-hw/idealo-query";
import { describe, expect, it } from "vitest";
import { FILTERS_COPY } from "../../../../src/features/filters/copy";
import { NO_CONTEXT } from "../../../../src/features/filters/model";
import {
  buildFilterViewModel,
  type FilterViewInput,
  panelNote,
} from "../../../../src/features/filters/view-model";
import { emptyRequirements } from "../../../../src/features/requirements";
import { catalog, group } from "../../requirements/catalog-fixtures";

const start = emptyQuery(categoryId("3751"));
const urlOf = (query: IdealoQuery): string => `https://idealo.test/?f=${query.filterIds.join(",")}`;

const input = (over: Partial<FilterViewInput> = {}): FilterViewInput => ({
  query: start,
  startQuery: start,
  catalog: null,
  loaded: false,
  canFilter: true,
  shownText: "",
  search: "",
  requirements: emptyRequirements(),
  context: NO_CONTEXT,
  plan: null,
  urlOf,
  ...over,
});

const cpus: FilterCatalog = catalog(
  group("Prozessor", ["Intel Core i7", "AMD Ryzen 7"]),
  group("Arbeitsspeicher", ["16 GB", "32 GB"]),
);

describe("panelNote", () => {
  it("explains a search page without a category, before anything loads", () => {
    expect(panelNote(false, false, null)).toEqual({
      testId: "no-category-note",
      text: FILTERS_COPY.noCategoryNote,
    });
  });

  it("explains unreadable filters only once loading finished", () => {
    expect(panelNote(true, false, null)).toBeNull();
    expect(panelNote(true, true, null)?.testId).toBe("no-catalog-note");
  });

  it("stays quiet when the catalog was read", () => {
    expect(panelNote(true, true, cpus)).toBeNull();
  });
});

describe("buildFilterViewModel", () => {
  it("offers only text, price and sort without a catalog", () => {
    const model = buildFilterViewModel(input({ loaded: true }));
    expect(model.requirements).toBeNull();
    expect(model.picker.available).toBe(false);
    expect(model.note?.testId).toBe("no-catalog-note");
    expect(model.priceInputs).toEqual({ price: undefined });
  });

  it("shows requirement controls once the catalog is there, never on a page without category", () => {
    expect(
      buildFilterViewModel(input({ catalog: cpus, loaded: true })).requirements,
    ).not.toBeNull();
    expect(
      buildFilterViewModel(input({ catalog: cpus, loaded: true, canFilter: false })).requirements,
    ).toBeNull();
  });

  it("swaps the price inputs for the requirement slider when the page has price bounds", () => {
    const context = { ...NO_CONTEXT, priceBounds: { min: 100, max: 900 } };
    expect(buildFilterViewModel(input({ context })).priceInputs).toBeNull();
    expect(buildFilterViewModel(input({ context, canFilter: false })).priceInputs).not.toBeNull();
  });

  it("lists the default order, known sorts with their label and an unknown current sort as is", () => {
    const plain = buildFilterViewModel(input()).sort;
    expect(plain.value).toBe("");
    expect(plain.options).toEqual([
      { value: "", label: "Default order" },
      { value: "minPrice", label: "Lowest price first" },
    ]);

    const odd = buildFilterViewModel(input({ query: setSort(start, "rating") })).sort;
    expect(odd.value).toBe("rating");
    expect(odd.options.at(-1)).toEqual({ value: "rating", label: "rating" });
  });

  it("narrows the picker to options whose label contains the search, dropping empty groups", () => {
    const model = buildFilterViewModel(input({ catalog: cpus, search: "  ryzen " }));
    expect(model.picker.available).toBe(true);
    expect(model.picker.groups.map((g) => [g.name, g.filters.map((f) => f.label)])).toEqual([
      ["Prozessor", ["AMD Ryzen 7"]],
    ]);
  });

  it("marks the options already in the query as selected", () => {
    const picked = cpus.groups[0]?.filters[0]?.filterId ?? filterId("0");
    const model = buildFilterViewModel(
      input({ catalog: cpus, query: toggleFilter(start, picked) }),
    );
    expect(model.picker.selected.has(picked)).toBe(true);
  });

  it("keeps apply off until the url differs from the page's own, and while there is none", () => {
    expect(buildFilterViewModel(input()).applyDisabled).toBe(true);
    const changed = toggleFilter(start, filterId("1001"));
    expect(buildFilterViewModel(input({ query: changed })).applyDisabled).toBe(false);
    expect(buildFilterViewModel(input({ query: changed, urlOf: () => "" })).applyDisabled).toBe(
      true,
    );
  });

  it("shows the hit estimate of the plan only when it has one", () => {
    const plan = (hitsUpperBound: number | null) => ({ query: start, facets: [], hitsUpperBound });
    expect(buildFilterViewModel(input()).hits).toBeNull();
    expect(buildFilterViewModel(input({ plan: plan(null) })).hits).toBeNull();
    expect(buildFilterViewModel(input({ plan: plan(1234) })).hits).toBe("≤ 1.234 products");
  });

  it("links and summarises the planned query rather than the edited one", () => {
    const planned = toggleFilter(start, filterId("1001"));
    const model = buildFilterViewModel(
      input({ catalog: cpus, plan: { query: planned, facets: [], hitsUpperBound: null } }),
    );
    expect(model.url).toBe(urlOf(planned));
    expect(model.applyDisabled).toBe(false);
  });
});
