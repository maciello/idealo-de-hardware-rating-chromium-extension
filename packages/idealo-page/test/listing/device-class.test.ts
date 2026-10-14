// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { formFactorOfCategory, listingFormFactor } from "../../src/listing";

const doc = (links: string[] = []): Document =>
  new DOMParser().parseFromString(
    `<body>${links.map((href) => `<a href="${href}">x</a>`).join("")}</body>`,
    "text/html",
  );
const CAT = "https://www.idealo.de/preisvergleich/ProductCategory/";

describe("formFactorOfCategory", () => {
  it("maps Notebooks to laptop, PC-Systeme to desktop and everything else to unknown", () => {
    expect(formFactorOfCategory("3751")).toBe("laptop");
    expect(formFactorOfCategory("3020")).toBe("desktop");
    expect(formFactorOfCategory("19116")).toBe("unknown");
  });
});

describe("listingFormFactor", () => {
  it("reads the category from the url, filters included", () => {
    expect(listingFormFactor(`${CAT}3751F107301240-471878.html`, doc())).toBe("laptop");
    expect(listingFormFactor(`${CAT}3020F720310.html`, doc())).toBe("desktop");
    expect(listingFormFactor(`${CAT}19116.html`, doc())).toBe("unknown");
  });

  it("uses the page's links for a search page, and unknown without a category", () => {
    const search = "https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=x";
    expect(listingFormFactor(search, doc(["/preisvergleich/ProductCategory/3751.html"]))).toBe(
      "laptop",
    );
    expect(listingFormFactor(search, doc())).toBe("unknown");
    expect(listingFormFactor("https://www.idealo.de/", doc())).toBe("unknown");
  });
});
