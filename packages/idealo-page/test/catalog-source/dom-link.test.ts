// @vitest-environment jsdom

import { categoryId, filterId, type IdealoQuery, parseIdealoUrl } from "@idealo-hw/idealo-query";
import { describe, expect, it } from "vitest";
import { domLinkCatalog } from "../../src/catalog-source";
import listingHtml from "../fixtures/listing.html?raw";

const queryOf = (url: string): IdealoQuery => {
  const parsed = parseIdealoUrl(url);
  if (parsed.kind !== "category") throw new Error("not a category url");
  return parsed.query;
};

const load = (query: IdealoQuery, html = listingHtml) =>
  domLinkCatalog.load({
    document: new DOMParser().parseFromString(html, "text/html"),
    url: "https://www.idealo.de/",
    query,
  });

describe("domLinkCatalog (synthetic fixture)", () => {
  const base = queryOf("https://www.idealo.de/preisvergleich/ProductCategory/19116.html");

  it("derives options from toggle links and groups them by nearest heading or legend", async () => {
    const catalog = await load(base);
    expect(catalog?.categoryId).toBe(categoryId("19116"));
    expect(
      catalog?.groups.map((g) => [g.name, g.filters.map((f) => [f.filterId, f.label])]),
    ).toEqual([
      [
        "Prozessor-Hersteller",
        [
          ["1234", "Intel"],
          ["5678", "AMD"],
        ],
      ],
      [
        "Arbeitsspeicher",
        [
          ["2222", "16 GB"],
          ["3333", "32 GB"],
        ],
      ],
      ["Other", [["4444", "Touchscreen"]]],
    ]);
  });

  it("ignores multi-id, other-category and sort-only links", async () => {
    const ids = (await load(base))?.groups.flatMap((g) => g.filters.map((f) => f.filterId));
    expect(ids).not.toContain(filterId("9999"));
    expect(ids).toHaveLength(5);
  });

  it("also recognises removal links of already selected filters", async () => {
    const html = `<h4>Marke</h4><ul><li><a href="/preisvergleich/ProductCategory/19116.html">Intel</a></li></ul>`;
    const selected = queryOf(
      "https://www.idealo.de/preisvergleich/ProductCategory/19116F1234.html",
    );
    const catalog = await load(selected, html);
    expect(catalog?.groups[0]?.filters[0]?.filterId).toBe(filterId("1234"));
  });

  it("returns null when the page offers no filter links", async () => {
    expect(await load(base, "<main>nothing</main>")).toBeNull();
  });
});
