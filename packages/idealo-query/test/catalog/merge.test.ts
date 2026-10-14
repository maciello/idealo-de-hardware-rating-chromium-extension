import { describe, expect, it } from "vitest";
import {
  categoryId,
  emptyQuery,
  type FilterCatalog,
  filterId,
  type ModelScorer,
  mergeCatalogs,
  planRequirements,
  vocabularyOf,
} from "../../src/index";

const notebooks = categoryId("3751");
const option = (id: string, label: string, count?: number) => ({
  filterId: filterId(id),
  label,
  ...(count === undefined ? {} : { count }),
});

/** The listing a high-end filter state serves: one Prozessor option of many. */
const current: FilterCatalog = {
  categoryId: notebooks,
  groups: [
    {
      attributeId: "processor",
      name: "Prozessor",
      filters: [option("106585393", "Intel Core Ultra 9 275HX", 598), option("1", "Apple M5", 969)],
    },
    { attributeId: "ram", name: "Arbeitsspeicher", filters: [option("7612877", "32 GB", 4319)] },
  ],
  manufacturers: [],
};

/** What an earlier, low-end state listed (DOM-link source: other attribute ids). */
const earlier: FilterCatalog = {
  categoryId: notebooks,
  groups: [
    {
      attributeId: "prozessor",
      name: " prozessor ",
      filters: [option("1", "Apple M5", 12), option("103705794", "Intel Core i7-12650H", 35)],
    },
    { attributeId: "typ", name: "Notebook-Typ", filters: [option("1466479", "Gaming Notebook")] },
  ],
  manufacturers: [],
};

describe("mergeCatalogs", () => {
  it("appends unlisted options to the group of the same name, without counts", () => {
    const merged = mergeCatalogs(current, vocabularyOf(earlier));
    expect(merged.groups.map((g) => g.name)).toEqual([
      "Prozessor",
      "Arbeitsspeicher",
      "Notebook-Typ",
    ]);
    expect(merged.groups[0]?.filters).toEqual([
      option("106585393", "Intel Core Ultra 9 275HX", 598),
      option("1", "Apple M5", 969),
      option("103705794", "Intel Core i7-12650H"),
    ]);
    expect(merged.groups[0]?.attributeId).toBe("processor");
  });

  describe("with two groups of one name", () => {
    const memory = (attributeId: string, filters: ReturnType<typeof option>[]) => ({
      attributeId,
      name: "Grafikspeicher",
      filters,
    });
    const listing: FilterCatalog = {
      ...current,
      groups: [
        memory("15869", [option("1", "Shared Memory"), option("2", "8 GB")]),
        memory("31502", [option("3", "8 GB"), option("4", "16 GB")]),
      ],
    };

    it("keeps both groups when the vocabulary adds nothing", () => {
      expect(mergeCatalogs(listing, vocabularyOf(listing)).groups).toEqual(listing.groups);
    });

    it("adds a remembered option to the group with the same attribute id", () => {
      const seen: FilterCatalog = {
        ...listing,
        groups: [memory("31502", [option("5", "24 GB")])],
      };
      const [shared, dedicated] = mergeCatalogs(listing, seen).groups;
      expect(shared?.filters.map((f) => f.label)).toEqual(["Shared Memory", "8 GB"]);
      expect(dedicated?.filters.map((f) => f.label)).toEqual(["8 GB", "16 GB", "24 GB"]);
    });

    it("gives a remembered option of an unknown attribute id its own group", () => {
      const seen: FilterCatalog = {
        ...listing,
        groups: [memory("99999", [option("6", "32 GB")])],
      };
      const groups = mergeCatalogs(listing, seen).groups;
      expect(groups.map((g) => g.attributeId)).toEqual(["15869", "31502", "99999"]);
    });
  });

  it("leaves catalogs of another category alone", () => {
    const other = { ...earlier, categoryId: categoryId("3020") };
    expect(mergeCatalogs(current, other)).toBe(current);
  });
});

describe("planRequirements over a merged catalog", () => {
  const SCORES: Readonly<Record<string, number>> = {
    "Intel Core Ultra 9 275HX": 57_000,
    "Apple M5": 18_000,
    "Intel Core i7-12650H": 22_000,
  };
  const scorer: ModelScorer = (_facet, label) =>
    SCORES[label] === undefined ? null : { cpu_mark: SCORES[label] };
  /** The url an earlier plan at cpu_mark >= 20000 produced. */
  const base = {
    ...emptyQuery(notebooks),
    filterIds: [filterId("103705794"), filterId("7612877")],
  };
  const requirement = { models: { cpu_model: { minimums: { cpu_mark: 50_000 } } } };

  it("keeps an earlier plan's CPU the current listing does not show", () => {
    const plan = planRequirements(requirement, current, base, scorer);
    expect(plan.query.filterIds).toContain(filterId("103705794"));
  });

  it("replaces it once the vocabulary knows its group", () => {
    const plan = planRequirements(
      requirement,
      mergeCatalogs(current, vocabularyOf(earlier)),
      base,
      scorer,
    );
    expect([...plan.query.filterIds].sort()).toEqual(
      [filterId("106585393"), filterId("7612877")].sort(),
    );
  });
});
