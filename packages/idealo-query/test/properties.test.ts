import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  addFilters,
  addManufacturers,
  categoryId,
  type FilterCatalog,
  filterId,
  foldManufacturers,
  type IdealoQuery,
  type ManufacturerId,
  manufacturerId,
  normalizeQuery,
  parseIdealoUrl,
  removeFilters,
  removeManufacturers,
  resetPaging,
  setOffset,
  setPrice,
  setSort,
  setText,
  toggleFilter,
  toWebUrl,
} from "../src/index";

const digitString = (max: number) =>
  fc.string({ unit: fc.constantFrom(..."0123456789"), minLength: 1, maxLength: max });

const categoryIdArb = digitString(8).map(categoryId);
const filterIdArb = digitString(9).map(filterId);
const manufacturerIdArb = digitString(5).map(manufacturerId);

const suffixArb = fc
  .tuple(
    fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"),
    fc.string({
      unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"),
      maxLength: 8,
    }),
  )
  .map(([head, tail]) => head + tail)
  .filter((s) => !/^F\d/.test(s));

const cents = fc.integer({ min: 0, max: 10_000_000 }).map((c) => c / 100);
const priceArb = fc.record({ min: cents, max: cents }, { requiredKeys: [] });

const textArb = fc.oneof(
  fc.string({ unit: "grapheme", maxLength: 20 }),
  fc.string({ unit: fc.constantFrom(..."ab &=?#%+/é€ "), maxLength: 12 }),
);

const queryArb = (manufacturers: fc.Arbitrary<ManufacturerId[]>) =>
  fc
    .record(
      {
        categoryId: categoryIdArb,
        filterIds: fc.array(filterIdArb, { maxLength: 40 }),
        manufacturerIds: manufacturers,
        price: priceArb,
        sort: fc.oneof(
          fc.constant("minPrice"),
          fc.string({ unit: "grapheme", minLength: 1, maxLength: 10 }),
        ),
        offset: fc.integer({ min: 0, max: 100_000 }),
        text: textArb,
        opaqueSuffix: suffixArb,
      },
      { requiredKeys: ["categoryId", "filterIds", "manufacturerIds"] },
    )
    .map((r): IdealoQuery => r);

const webQueryArb = queryArb(fc.constant([]));
const anyQueryArb = queryArb(fc.array(manufacturerIdArb, { maxLength: 5 }));

describe("web URL round trip", () => {
  it("parse(toWebUrl(q)) equals normalize(q)", () => {
    fc.assert(
      fc.property(webQueryArb, (q) => {
        const parsed = parseIdealoUrl(toWebUrl(q));
        expect(parsed.kind).toBe("category");
        if (parsed.kind === "category") expect(parsed.query).toEqual(normalizeQuery(q));
      }),
      { numRuns: 500 },
    );
  });

  it("toWebUrl(parse(url)) is stable", () => {
    fc.assert(
      fc.property(webQueryArb, (q) => {
        const url = toWebUrl(q);
        const parsed = parseIdealoUrl(url);
        if (parsed.kind !== "category") throw new Error("not a category");
        expect(toWebUrl(parsed.query)).toBe(url);
      }),
    );
  });

  it("never serializes a filter id twice", () => {
    fc.assert(
      fc.property(webQueryArb, (q) => {
        const match = /ProductCategory\/\d+(?:F(\d+(?:-\d+)*))?/.exec(toWebUrl(q));
        const ids = match?.[1]?.split("-") ?? [];
        expect(new Set(ids).size).toBe(ids.length);
      }),
    );
  });

  it("round-trips manufacturers that a catalog maps to filter ids", () => {
    fc.assert(
      fc.property(anyQueryArb, (q) => {
        const normalized = normalizeQuery(q);
        const catalog: FilterCatalog = {
          categoryId: normalized.categoryId,
          groups: [],
          manufacturers: normalized.manufacturerIds.map((id, i) => ({
            manufacturerId: id,
            name: `m${i}`,
            searchFilterId: filterId(`9${i}`),
          })),
        };
        const folded = foldManufacturers(q, catalog);
        const parsed = parseIdealoUrl(toWebUrl(q, { catalog }));
        if (parsed.kind !== "category") throw new Error("not a category");
        expect(parsed.query).toEqual(folded);
        expect(folded.manufacturerIds).toEqual([]);
      }),
    );
  });
});

describe("normalizeQuery", () => {
  it("is idempotent", () => {
    fc.assert(
      fc.property(anyQueryArb, (q) => {
        const once = normalizeQuery(q);
        expect(normalizeQuery(once)).toEqual(once);
      }),
    );
  });
});

describe("selection algebra", () => {
  const ids = fc.array(filterIdArb, { maxLength: 10 });

  it("addFilters is idempotent", () => {
    fc.assert(
      fc.property(anyQueryArb, ids, (q, add) => {
        const once = addFilters(q, add);
        expect(addFilters(once, add)).toEqual(once);
      }),
    );
  });

  it("removeFilters is idempotent", () => {
    fc.assert(
      fc.property(anyQueryArb, ids, (q, rm) => {
        const once = removeFilters(q, rm);
        expect(removeFilters(once, rm)).toEqual(once);
      }),
    );
  });

  it("toggling twice is identity up to normalization and paging", () => {
    fc.assert(
      fc.property(anyQueryArb, filterIdArb, (q, id) => {
        const base = resetPaging(q);
        const twice = toggleFilter(toggleFilter(base, id), id);
        if (base.filterIds.includes(id)) {
          expect(new Set(twice.filterIds)).toEqual(new Set(base.filterIds));
          expect(twice.filterIds).toEqual(base.filterIds.filter((x) => x !== id).concat(id));
        } else {
          expect(twice).toEqual(base);
        }
      }),
    );
  });

  it("toggling a fresh id twice is identity", () => {
    fc.assert(
      fc.property(anyQueryArb, filterIdArb, (q, id) => {
        const base = resetPaging(removeFilters(q, [id]));
        expect(toggleFilter(toggleFilter(base, id), id)).toEqual(base);
      }),
    );
  });

  it("add then remove of fresh ids restores the filters", () => {
    fc.assert(
      fc.property(anyQueryArb, ids, (q, add) => {
        const base = removeFilters(q, add);
        expect(removeFilters(addFilters(base, add), add).filterIds).toEqual(base.filterIds);
      }),
    );
  });

  it("changes that alter the result set reset the offset; others keep the rest untouched", () => {
    fc.assert(
      fc.property(anyQueryArb, filterIdArb, textArb, (input, id, text) => {
        const q = setOffset(
          addManufacturers(
            setSort(setText(setPrice(removeFilters(input, [id]), { min: 1 }), "t"), "s"),
            [],
          ),
          7,
        );
        const fresh = manufacturerId("123456789");
        for (const next of [
          toggleFilter(q, id),
          setText(q, `${text}x`),
          setSort(q, "minPrice"),
          setPrice(q, { min: 2 }),
          addManufacturers(removeManufacturers(q, [fresh]), [fresh]),
        ]) {
          expect(next.offset).toBeUndefined();
          expect(next.categoryId).toBe(q.categoryId);
          expect(next.opaqueSuffix).toBe(q.opaqueSuffix);
        }
      }),
    );
  });

  it("ops keep results normalized", () => {
    fc.assert(
      fc.property(anyQueryArb, ids, (q, add) => {
        const next = addFilters(q, add);
        expect(normalizeQuery(next)).toEqual(next);
      }),
    );
  });
});
