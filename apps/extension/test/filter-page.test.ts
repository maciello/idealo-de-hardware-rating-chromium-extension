// @vitest-environment jsdom
import { categoryId, filterId } from "@idealo-hw/idealo-query";
import { describe, expect, it } from "vitest";
import { filterPageOf, guessCategoryId, toSearchUrl } from "../src/filters/page";

const doc = (links: string[]): Document =>
  new DOMParser().parseFromString(
    `<body>${links.map((href) => `<a href="${href}">x</a>`).join("")}</body>`,
    "text/html",
  );

const CAT = "/preisvergleich/ProductCategory/";
const SEARCH =
  "https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=laptop%2032GB";

describe("guessCategoryId", () => {
  it("picks the category most links point to", () => {
    expect(guessCategoryId(doc([`${CAT}111F1.html`, `${CAT}222.html`, `${CAT}222F5.html`]))).toBe(
      categoryId("222"),
    );
  });

  it("is null without category links", () => {
    expect(guessCategoryId(doc(["/other", "/preisvergleich/OffersOfProduct/1_a.html"]))).toBeNull();
  });
});

describe("filterPageOf", () => {
  it("builds category urls on category pages", () => {
    const page = filterPageOf(`https://www.idealo.de${CAT}19116F1234.html`, doc([]));
    expect(page).toMatchObject({ kind: "category", canFilter: true });
    expect(page?.toUrl(page.query)).toBe(`https://www.idealo.de${CAT}19116F1234.html`);
  });

  it("treats a search page with a recognisable category as a category search", () => {
    const page = filterPageOf(SEARCH, doc([`${CAT}19116F1234.html`]));
    expect(page).toMatchObject({ kind: "search", canFilter: true });
    expect(page?.query.text).toBe("laptop 32GB");
    expect(page?.toUrl({ ...page.query, filterIds: [filterId("4711")] })).toBe(
      `https://www.idealo.de${CAT}19116F4711.html?q=laptop%2032GB`,
    );
  });

  it("falls back to a text/price/sort search url when no category can be found", () => {
    const page = filterPageOf(`${SEARCH}&sortKey=minPrice&p=100-`, doc([]));
    expect(page).toMatchObject({ kind: "search", canFilter: false });
    expect(page?.toUrl(page.query)).toBe(
      "https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?p=100.0-&q=laptop%2032GB&sortKey=minPrice",
    );
  });

  it("returns null for other pages", () => {
    expect(filterPageOf("https://www.idealo.de/", doc([]))).toBeNull();
    expect(
      filterPageOf("https://www.idealo.de/preisvergleich/OffersOfProduct/1_a.html", doc([])),
    ).toBeNull();
  });
});

describe("toSearchUrl", () => {
  it("drops filters and category", () => {
    const page = filterPageOf(`${SEARCH}`, doc([]));
    const query = {
      ...(page?.query as NonNullable<typeof page>["query"]),
      filterIds: [filterId("1")],
    };
    expect(toSearchUrl(query)).toBe(
      "https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=laptop%2032GB",
    );
  });
});
