// @vitest-environment jsdom
import { categoryId, emptyQuery, filterId } from "@idealo-hw/idealo-query";
import { describe, expect, it } from "vitest";
import { firstCatalog } from "../src/filters/catalog-source";
import { domLinkCatalog } from "../src/filters/dom-link-catalog";
import { embeddedCatalog } from "../src/filters/embedded-catalog";
import { filterPageOf } from "../src/filters/page";
import listingHtml from "./fixtures/listing.html?raw";
import ssrHtml from "./fixtures/listing.idealo-ssr.html?raw";

const SSR_URL = "https://www.idealo.de/preisvergleich/ProductCategory/3751.html";
const SEARCH_URL = "https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=notebook";

const load = (html: string, url = "https://www.idealo.de/"): Document => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  Object.defineProperty(doc, "URL", { value: url });
  return doc;
};
const context = (document: Document, category = "3751") => ({
  document,
  url: document.URL,
  query: emptyQuery(categoryId(category)),
});

describe("embeddedCatalog (real payload shape)", () => {
  it("lists Prozessor, Grafikkarte and Hersteller with their ids and hit counts", async () => {
    const catalog = await embeddedCatalog.load(context(load(ssrHtml)));
    expect(catalog?.categoryId).toBe(categoryId("3751"));
    expect(catalog?.groups.map((g) => g.name)).toEqual(["Prozessor", "Grafikkarte", "Hersteller"]);
    expect(catalog?.groups[0]?.filters[0]).toEqual({
      filterId: filterId("107301240"),
      label: "AMD Ryzen 5 150",
      count: 75,
    });
    expect(catalog?.groups[2]?.filters.map((f) => [f.filterId, f.label])).toEqual([
      ["471878", "Acer"],
      ["1200167", "Alienware"],
      ["104852041", "Ankermann"],
    ]);
  });

  it("is not the catalog of another category", async () => {
    expect(await embeddedCatalog.load(context(load(ssrHtml), "19116"))).toBeNull();
  });

  it("cannot tell on a page without a payload", async () => {
    expect(await embeddedCatalog.load(context(load(listingHtml), "19116"))).toBeNull();
  });

  it("comes before the DOM link catalog", async () => {
    const source = firstCatalog([embeddedCatalog, domLinkCatalog]);
    const embedded = await source.load(context(load(ssrHtml)));
    expect(embedded?.groups.map((g) => g.name)).toContain("Prozessor");
    const dom = await source.load(context(load(listingHtml), "19116"));
    expect(dom?.groups.map((g) => g.name)).toContain("Prozessor-Hersteller");
  });
});

describe("filterPageOf with an embedded payload", () => {
  const withSelected = (url: string): Document =>
    load(
      ssrHtml.replace(
        /(window\.csr\.initialData\['searchResult'\] = ")([^"]+)/,
        (_match, head: string, payload: string) => {
          const json = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
          json.selectedFilters = [{ id: "107301240" }, { id: "471878" }];
          return `${head}${Buffer.from(JSON.stringify(json)).toString("base64")}`;
        },
      ),
      url,
    );

  it("pre-selects the filters the served search page had active, in the payload's category", () => {
    const page = filterPageOf(SEARCH_URL, withSelected(SEARCH_URL));
    expect(page).toMatchObject({ kind: "search", canFilter: true });
    expect(page?.query.categoryId).toBe(categoryId("3751"));
    expect(page?.query.filterIds).toEqual([filterId("107301240"), filterId("471878")]);
    expect(page?.query.text).toBe("notebook");
  });

  it("ignores a stale payload after a client-side navigation", () => {
    const doc = withSelected(SEARCH_URL);
    filterPageOf(SEARCH_URL, doc);
    const page = filterPageOf(`${SEARCH_URL}%20gaming`, doc);
    expect(page?.query.filterIds).toEqual([]);
    expect(page?.canFilter).toBe(false);
  });

  it("takes category pages from the url alone", () => {
    const page = filterPageOf(SSR_URL, withSelected(SSR_URL));
    expect(page?.query.filterIds).toEqual([]);
  });
});
