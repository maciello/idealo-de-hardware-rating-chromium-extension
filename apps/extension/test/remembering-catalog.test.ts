// @vitest-environment jsdom
import { categoryId, emptyQuery, type FilterCatalog, filterId } from "@idealo-hw/idealo-query";
import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import type { FilterCatalogSource } from "../src/filters/catalog-source";
import { rememberingCatalog } from "../src/filters/remembering-catalog";
import { vocabularyStorage } from "../src/filters/vocabulary-storage";

beforeEach(() => fakeBrowser.reset());

const notebooks = categoryId("3751");
const listing = (...cpus: [string, string, number][]): FilterCatalog => ({
  categoryId: notebooks,
  groups: [
    {
      attributeId: "processor",
      name: "Prozessor",
      filters: cpus.map(([id, label, count]) => ({ filterId: filterId(id), label, count })),
    },
  ],
  manufacturers: [],
});
const serving = (...catalogs: (FilterCatalog | null)[]): FilterCatalogSource => {
  let next = 0;
  return { id: "fake", load: async () => catalogs[next++] ?? null };
};
const context = { document, url: "https://www.idealo.de/", query: emptyQuery(notebooks) };

describe("rememberingCatalog", () => {
  it("adds options earlier pages listed, without their stale counts", async () => {
    const source = rememberingCatalog(
      serving(
        listing(["103705794", "Intel Core i7-12650H", 35]),
        listing(["106585393", "Intel Core Ultra 9 275HX", 598]),
      ),
      vocabularyStorage,
    );
    await source.load(context);
    const second = await source.load(context);
    expect(second?.groups[0]?.filters).toEqual([
      { filterId: "106585393", label: "Intel Core Ultra 9 275HX", count: 598 },
      { filterId: "103705794", label: "Intel Core i7-12650H" },
    ]);
  });

  it("passes a missing catalog through and stores nothing", async () => {
    const source = rememberingCatalog(serving(null), vocabularyStorage);
    expect(await source.load(context)).toBeNull();
    expect(await vocabularyStorage.load(notebooks)).toBeNull();
  });

  it("serves the plain catalog when the store fails", async () => {
    const failing = {
      load: () => Promise.reject(new Error("quota")),
      save: () => Promise.reject(new Error("quota")),
    };
    const plain = listing(["106585393", "Intel Core Ultra 9 275HX", 598]);
    expect(await rememberingCatalog(serving(plain), failing).load(context)).toEqual(plain);
  });
});
