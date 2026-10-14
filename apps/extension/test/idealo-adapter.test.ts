// @vitest-environment jsdom
import {
  extractCpuIdentity,
  parseSpecBlock,
  passmarkCpuSource,
  productContextFromSpecs,
} from "@idealo-hw/hw-bench";
import { describe, expect, it } from "vitest";
import { embeddedListing } from "../src/page/embedded-listing";
import { idealoAdapter } from "../src/page/idealo-adapter";
import { createRatingEngine, STRATEGY_CATALOG } from "../src/ratings/engine";
import listingHtml from "./fixtures/listing.html?raw";
import ssrHtml from "./fixtures/listing.idealo-ssr.html?raw";
import productHtml from "./fixtures/product.idealo-ssr.html?raw";

const load = (html: string): Document => new DOMParser().parseFromString(html, "text/html");

const MEDION = "205984319";
const DELL = "212702771";
const NITRO = "207096746";

describe("idealoAdapter.listingItems (real server-rendered tiles)", () => {
  const doc = load(ssrHtml);
  const items = idealoAdapter.listingItems(doc);

  it("finds the four tiles and reads product ids from the wishlist heart", () => {
    expect(items.map((i) => i.productId)).toEqual([MEDION, DELL, undefined, NITRO]);
    expect(items.every((i) => i.adapterId === "idealo_ssr")).toBe(true);
    expect(new Set(items.map((i) => i.element)).size).toBe(4);
    expect(items.every((i) => /^sr-resultItemTile_\w{5}\b/.test(i.element.className))).toBe(true);
  });

  it("reads title and price from the tile", () => {
    expect(items.map((i) => i.title)).toEqual([
      "Medion SPRCHRGD 14 S2 MD62722",
      'Dell Latitude 3410 14" Core i5-10210U, 32GB RAM, 2TB SSD',
      expect.stringMatching(/^Acer Ultra Laptop Intel Core i7-1165G7/),
      "Acer Nitro V 17 AI ANV17-41-R7EN",
    ]);
    expect(items.map((i) => i.priceEur)).toEqual([949, 649, 1099, 1219]);
  });

  it("takes the spec text from the embedded payload for tiles it lists", () => {
    expect(items[0]).toMatchObject({ textSource: "embedded" });
    expect(items[0]?.text).toContain("Intel Core Ultra 7 258V, 32 GB RAM");
    expect(items[3]?.text).toContain("AMD Ryzen 7 260");
    expect(items[2]).toMatchObject({ textSource: "dom", text: "" });
  });

  it("uses the rendered spec line when the payload does not list the tile", () => {
    const stale = load(
      ssrHtml.replace(`&quot;id&quot;:&quot;${MEDION}&quot;`, "&quot;id&quot;:&quot;1&quot;"),
    );
    const [first] = idealoAdapter.listingItems(stale);
    expect(first).toMatchObject({ productId: "1", textSource: "dom" });
    expect(first?.text).toBe(
      "Multimedia Notebook, 14 Zoll, 2,8K, Bildformat 16:10, Bildwiederholungsrate 120 Hz, Intel Core Ultra 7 258V, 32 GB RAM, 1.000 GB SSD-Speicher, Intel Arc Graphics 140V, Windows 11 Home, Microsoft Copilot, Akkulaufzeit 21 h, 1,4 kg",
    );
  });

  it("never attaches payload data to tiles on a page without a payload", () => {
    const noPayload = load(ssrHtml.replace(/<script[\s\S]*?<\/script>/, ""));
    expect(embeddedListing(noPayload)).toBeNull();
    const rendered = idealoAdapter.listingItems(noPayload);
    expect(rendered.map((i) => i.textSource)).toEqual(["dom", "dom", "dom", "dom"]);
    expect(rendered[0]?.text).toContain("Intel Core Ultra 7 258V");
  });

  it("falls back to the heuristic adapter only when no real tile is found", () => {
    const fallback = idealoAdapter.listingItems(load(listingHtml));
    expect(fallback).toHaveLength(5);
    expect(fallback.every((i) => i.adapterId === "heuristic_idealo")).toBe(true);
    expect(idealoAdapter.listingItems(load("<main><p>leer</p></main>"))).toEqual([]);
  });
});

describe("embeddedListing", () => {
  it("parses the inline payload once per document", () => {
    const doc = load(ssrHtml);
    const first = embeddedListing(doc);
    expect(first?.categoryId).toBe("3751");
    expect(first?.page.items).toHaveLength(4);
    expect(first?.page.resultCount).toBe(53609);
    expect(embeddedListing(doc)).toBe(first);
  });

  it("returns null for a malformed payload instead of throwing", () => {
    const broken = ssrHtml.replace(/(searchResult'\] = ")[^"]+/, "$1e30=");
    expect(embeddedListing(load(broken))).toBeNull();
  });
});

const row = (id: number, name: string, cpumark: string) => ({
  id: String(id),
  name,
  cpumark,
  thread: "3,000",
  cat: "Laptop",
  cpuCount: 1,
  cores: "8",
  logicals: "2",
  secondaryCores: "0",
  secondaryLogicals: "0",
  date: "Mar 2024",
});

describe("fixture listing through the rating engine", () => {
  const snapshot = passmarkCpuSource.parse(
    JSON.stringify({
      data: [
        row(1, "Intel Core Ultra 7 258V", "21,000"),
        row(2, "Intel Core i5-10210U", "6,300"),
        row(3, "AMD Ryzen 7 260", "26,000"),
        row(4, "Intel Core i7-1165G7", "9,900"),
      ],
    }),
  );
  const engine = createRatingEngine(
    snapshot,
    STRATEGY_CATALOG.map((s) => s.id),
  );
  const items = idealoAdapter.listingItems(load(ssrHtml));
  const ratings = engine.rate(
    items.map(({ title, text, priceEur }) => ({ title, text, priceEur })),
  );
  const cpuOf = (index: number): string | undefined => {
    const rating = ratings[index];
    return rating?.status === "matched" ? rating.record.name : undefined;
  };

  it("rates the three products with the CPU their tile names", () => {
    expect([cpuOf(0), cpuOf(1), cpuOf(3)]).toEqual([
      "Intel Core Ultra 7 258V",
      "Intel Core i5-10210U",
      "AMD Ryzen 7 260",
    ]);
  });

  it("rates the offer tile from the CPU in its title", () => {
    expect(items[2]?.productId).toBeUndefined();
    expect(cpuOf(2)).toBe("Intel Core i7-1165G7");
  });
});

describe("idealoAdapter.productInfo (real product page)", () => {
  const info = idealoAdapter.productInfo(load(productHtml));

  it("anchors on the h1 and reads the title from its span", () => {
    expect(info?.title).toBe("Honor MagicBook Pro 14");
    expect(info?.element?.id).toBe("oopStage-title");
  });

  it("turns datasheet rows into label/value lines and skips section headers", () => {
    const lines = info?.specText.split("\n") ?? [];
    expect(lines).toContain("Notebook-Typ\tMultimedia Notebook");
    expect(lines).toContain("Prozessor\tIntel Core Ultra 9 285H");
    expect(lines).toContain("Grafikkarte\tIntel Arc Graphics");
    expect(lines).toContain("RAM\t32 GB");
    expect(lines.some((line) => !line.includes("\t"))).toBe(false);
    expect(lines).not.toContain("Display");
  });

  it("gives hw-bench the CPU text and a laptop form factor", () => {
    const context = productContextFromSpecs(parseSpecBlock(info?.specText ?? ""), {
      title: info?.title ?? "",
    });
    expect(context).toMatchObject({
      cpuText: "Intel Core Ultra 9 285H",
      gpuText: "Intel Arc Graphics",
      formFactor: "laptop",
    });
    expect(extractCpuIdentity(info?.specText ?? "")).not.toBeNull();
  });

  it("falls back to the heuristic reading on markup without the datasheet", () => {
    const fallback = idealoAdapter.productInfo(load("<h1>Fallback Titel</h1>"));
    expect(fallback?.title).toBe("Fallback Titel");
  });
});
