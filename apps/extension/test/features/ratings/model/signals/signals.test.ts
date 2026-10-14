import { describe, expect, it } from "vitest";
import {
  type ItemRating,
  type RatingQuery,
  type RatingView,
  rateQueries,
  signalsOf,
  signatureOf,
} from "../../../../../src/features/ratings/model";
import { factsOf, signalsSignatureOf } from "../../../../../src/features/ratings/model/signals";

const NOW = { year: 2026 };
const NO_MATCH: ItemRating = { status: "no_match" };
const AMBIGUOUS: ItemRating = { status: "ambiguous", candidates: [] };

const query = (extra: Partial<RatingQuery> = {}): RatingQuery => ({
  title: "Notebook",
  text: "",
  formFactor: "laptop",
  ...extra,
});

const idsOf = (rating: ItemRating, q: RatingQuery): string[] =>
  signalsOf(q, rating, NOW).map((s) => s.id);

describe("signalsOf", () => {
  it.each([
    ["an ambiguous CPU", AMBIGUOUS],
    ["no CPU match", NO_MATCH],
  ])("flags the product even with %s", (_name, rating) => {
    expect(idsOf(rating, query({ datasheet: "RAM\t4 GB" }))).toEqual(["red_flags.ram_tiny"]);
  });

  it("reads a tile's characteristics as separate values", () => {
    const tile = query({ characteristics: ["4 GB RAM", "128 GB SSD-Speicher", "Windows 11 Home"] });
    expect(idsOf(NO_MATCH, tile)).toEqual(["red_flags.ram_tiny", "red_flags.storage_tiny"]);
  });

  it("reads a product page's datasheet", () => {
    const sheet = query({ datasheet: "RAM\t8 GB\nSSD-Speicher\t512 GB\nMarkteinführung\t2019" });
    expect(idsOf(NO_MATCH, sheet)).toEqual(["red_flags.ram_low", "red_flags.model_old"]);
  });

  it("raises nothing for a tile without payload facts", () => {
    expect(idsOf(NO_MATCH, query({ text: "Intel Core i5, 4 GB RAM" }))).toEqual([]);
  });

  it("never splits the joined text into facts", () => {
    const joined = query({ text: "4 GB RAM, 128 GB SSD-Speicher" });
    expect(factsOf(joined)).toEqual({});
  });

  it("judges the model's age against the injected year", () => {
    const sheet = query({ datasheet: "Markteinführung\t2021" });
    expect(signalsOf(sheet, NO_MATCH, { year: 2026 }).map((s) => s.id)).toEqual([
      "red_flags.model_old",
    ]);
    expect(signalsOf(sheet, NO_MATCH, { year: 2024 })).toEqual([]);
  });
});

describe("factsOf", () => {
  it("lets the datasheet win over the tile where both state a fact", () => {
    const both = query({
      datasheet: "RAM\t16 GB",
      characteristics: ["4 GB RAM", "Windows 11 Home"],
    });
    expect(factsOf(both)).toMatchObject({ ramGb: 16, osKind: "windows" });
    expect(idsOf(NO_MATCH, both)).toEqual([]);
    const reverse = query({ datasheet: "RAM\t4 GB", characteristics: ["16 GB RAM"] });
    expect(factsOf(reverse).ramGb).toBe(4);
  });

  it("fills what the datasheet leaves out from the tile", () => {
    const both = query({ datasheet: "RAM\t16 GB", characteristics: ["256 GB SSD-Speicher"] });
    expect(factsOf(both)).toMatchObject({ ramGb: 16, storageGb: 256, storageKind: "ssd" });
  });

  it("carries the RAM type the item's spec text names", () => {
    expect(factsOf(query({ text: "Intel Core i7-13700H, 16 GB RAM, DDR4" })).ramType).toEqual({
      label: "DDR4",
      generation: 4,
      lowPower: false,
    });
    expect(factsOf(query({ text: "Intel Core i7-13700H, LPDDR5X" })).ramType).toEqual({
      label: "LPDDR5X",
      generation: 5,
      lowPower: true,
    });
  });

  it("ignores graphics memory and unstated types", () => {
    expect(
      factsOf(query({ text: "Intel Core i7-13700H, Grafikspeichertyp GDDR6" })).ramType,
    ).toBeUndefined();
    expect(factsOf(query({ text: "Intel Core i7-13700H, 16 GB RAM" })).ramType).toBeUndefined();
  });

  it("reads the datasheet's RAM-type row", () => {
    expect(
      factsOf(query({ text: "RAM Typ\tDDR4", datasheet: "RAM Typ\tDDR4" })).ramType?.label,
    ).toBe("DDR4");
  });
});

describe("the older-memory flag", () => {
  const flag = (text: string) =>
    signalsOf(query({ text }), NO_MATCH, NOW).find((s) => s.id === "red_flags.ram_type_outdated");

  it("is raised for DDR4 with the type as evidence, and for nothing newer", () => {
    expect(flag("Intel Core i7-13700H, DDR4")).toMatchObject({
      severity: "amber",
      evidence: [{ field: "ramType", value: { kind: "ram_type", label: "DDR4" } }],
    });
    expect(flag("Intel Core i7-13700H, DDR5")).toBeUndefined();
    expect(flag("Intel Core i7-13700H, LPDDR5X")).toBeUndefined();
    expect(flag("Intel Core i7-13700H, Grafikspeichertyp GDDR6")).toBeUndefined();
    expect(flag("Intel Core i7-13700H, 16 GB RAM")).toBeUndefined();
  });
});

describe("rateQueries", () => {
  const NO_ENGINES: RatingView = {
    engine: null,
    gpuEngine: null,
    primaryId: "raw_multithread_score",
    importedAt: null,
  };

  it("raises product signals without any benchmark data imported", () => {
    const [first] = rateQueries(NO_ENGINES, [query({ datasheet: "RAM\t4 GB" })], NOW);
    expect(first?.rating).toEqual(NO_MATCH);
    expect(first?.signals.map((s) => s.id)).toEqual(["red_flags.ram_tiny"]);
  });
});

describe("signatures", () => {
  const withRam = (gb: number) => signalsOf(query({ datasheet: `RAM\t${gb} GB` }), NO_MATCH, NOW);

  it("tells a chip with other flags apart", () => {
    expect(signalsSignatureOf(withRam(4))).not.toBe(signalsSignatureOf(withRam(16)));
    expect(signalsSignatureOf(withRam(4))).not.toBe(signalsSignatureOf(withRam(8)));
    expect(signalsSignatureOf(withRam(4))).toBe(signalsSignatureOf(withRam(4)));
  });

  it("makes the chip's signature change when its flags change", () => {
    expect(signatureOf(NO_MATCH, null, withRam(4))).not.toBe(signatureOf(NO_MATCH, null, []));
    expect(signatureOf(NO_MATCH, null, withRam(4))).not.toBe(
      signatureOf(NO_MATCH, null, withRam(8)),
    );
  });
});
