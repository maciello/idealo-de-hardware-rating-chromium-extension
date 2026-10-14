// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { PageInspection } from "../src/contracts";
import { buildPageReport } from "../src/diagnostics/page-report";
import { embeddedStatus } from "../src/page/embedded-listing";
import { idealoAdapter } from "../src/page/idealo-adapter";
import ssrHtml from "./fixtures/listing.idealo-ssr.html?raw";

const URL_3751 = "https://www.idealo.de/preisvergleich/ProductCategory/3751.html";
const doc = new DOMParser().parseFromString(ssrHtml, "text/html");
const items = idealoAdapter.listingItems(doc);

const inspect = (rated: readonly boolean[]): PageInspection => ({
  kind: "listing",
  items: items.map((item, i) => ({
    adapterId: item.adapterId,
    productId: item.productId ?? null,
    textSource: item.textSource,
    title: item.title,
    text: item.text,
    rated: rated[i] ?? false,
  })),
});

describe("buildPageReport", () => {
  const report = buildPageReport(
    URL_3751,
    inspect([true, true, false, false]),
    embeddedStatus(doc),
  );

  it("counts tiles, product ids, payload matches and rated tiles", () => {
    expect(report).toMatchObject({
      url: URL_3751,
      kind: "listing",
      adapterId: "idealo_ssr",
      tiles: 4,
      tilesWithProductId: 3,
      tilesMatchedToPayload: 3,
      tilesRated: 2,
    });
  });

  it("lists unrated tiles with their spec text", () => {
    expect(report.unrated.map((u) => u.title.slice(0, 20))).toEqual([
      "Acer Ultra Laptop In",
      "Acer Nitro V 17 AI A",
    ]);
    expect(report.unrated[1]?.text).toContain("AMD Ryzen 7 260");
  });

  it("describes the embedded payload", () => {
    expect(report.payload).toEqual({
      present: true,
      categoryId: "3751",
      resultCount: 53609,
      error: null,
    });
  });

  it("reports an absent payload and an empty page", () => {
    const empty = buildPageReport(
      URL_3751,
      { kind: "other", items: [] },
      { listing: null, error: null },
    );
    expect(empty).toMatchObject({
      adapterId: null,
      tiles: 0,
      payload: { present: false, categoryId: null, resultCount: null, error: null },
    });
  });

  it("caps the unrated examples at 20 and shortens long text", () => {
    const many: PageInspection = {
      kind: "listing",
      items: Array.from({ length: 30 }, (_, i) => ({
        adapterId: "idealo_ssr",
        productId: String(i),
        textSource: "dom" as const,
        title: `t${i}`,
        text: "x".repeat(1000),
        rated: false,
      })),
    };
    const capped = buildPageReport(URL_3751, many, { listing: null, error: "bad payload" });
    expect(capped.tiles).toBe(30);
    expect(capped.unrated).toHaveLength(20);
    expect(capped.unrated[0]?.text).toHaveLength(300);
    expect(capped.payload.error).toBe("bad payload");
  });
});
