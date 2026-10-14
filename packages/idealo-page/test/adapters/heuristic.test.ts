// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { heuristicIdealoAdapter as adapter } from "../../src/adapters/heuristic";
import listingHtml from "../fixtures/listing.html?raw";
import productHtml from "../fixtures/product.html?raw";

const load = (html: string): Document => new DOMParser().parseFromString(html, "text/html");

describe("heuristicIdealoAdapter.detect", () => {
  it.each([
    ["https://www.idealo.de/preisvergleich/ProductCategory/19116F1234.html", "listing"],
    ["https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=laptop", "listing"],
    ["https://www.idealo.de/preisvergleich/OffersOfProduct/1001_alpha.html", "product"],
    ["https://www.idealo.de/", "other"],
    ["https://example.com/preisvergleich/ProductCategory/1.html", "other"],
  ])("%s -> %s", (url, kind) => {
    expect(adapter.detect(url)).toBe(kind);
  });
});

describe("heuristicIdealoAdapter.listingItems (synthetic fixture)", () => {
  const items = adapter.listingItems(load(listingHtml));

  it("finds one item per product, with and without a wishlist heart", () => {
    expect(items.map((i) => i.productId)).toEqual(["1001", "1002", "1003", "1004", "1005"]);
    expect(new Set(items.map((i) => i.element)).size).toBe(5);
    expect(items.every((i) => i.element.tagName === "LI")).toBe(true);
  });

  it("reads titles from the product link", () => {
    expect(items[0]?.title).toBe("Alpha Book 15 Notebook Intel Core i7-13700H 16GB 512GB");
    expect(items[1]?.title).toBe("Beta Air 14 Notebook");
  });

  it("keeps the whole item text for CPUs that are not in the title", () => {
    expect(items[1]?.text).toContain("AMD Ryzen 5 7640U");
  });

  it("parses German prices from the price node or, failing that, the text", () => {
    expect(items.map((i) => i.priceEur)).toEqual([1299, 899, 1999, 549, 479.99]);
  });

  it("returns nothing on a page without product links", () => {
    expect(adapter.listingItems(load("<main><p>leer</p></main>"))).toEqual([]);
  });

  it("does not merge neighbouring items that share a plain container", () => {
    const doc =
      load(`<div><div><a href="/preisvergleich/OffersOfProduct/1_a.html">A i5-1235U</a></div>
      <div><a href="/preisvergleich/OffersOfProduct/2_b.html">B i7-1255U</a></div></div>`);
    const found = adapter.listingItems(doc);
    expect(found.map((i) => i.title)).toEqual(["A i5-1235U", "B i7-1255U"]);
  });
});

describe("heuristicIdealoAdapter.productInfo (synthetic fixture)", () => {
  it("reads title and low price from the Product script and specs from tables", () => {
    const info = adapter.productInfo(load(productHtml));
    expect(info?.title).toBe("Alpha Book 15 Notebook");
    expect(info?.priceEur).toBe(1299);
    expect(info?.specText).toContain("Intel Core i7-13700H");
    expect(info?.element?.tagName).toBe("H1");
  });

  it("falls back to the h1 when the script block is malformed", () => {
    const doc = load('<script data-testid="Product">{oops</script><h1>Fallback Titel</h1>');
    expect(adapter.productInfo(doc)?.title).toBe("Fallback Titel");
  });

  it("returns null on pages without any title", () => {
    expect(adapter.productInfo(load("<p>nichts</p>"))).toBeNull();
  });
});
