import { describe, expect, it } from "vitest";
import {
  allAtLeast,
  allAtMost,
  categoryId,
  type FacetGroup,
  facetsOf,
  type Interval,
  parseSearchResult,
} from "../../../src/index";
import fixture from "../../fixtures/catalog-groups.3751-3020.json" with { type: "json" };

/** Real filter groups (labels, ids, hits) of Notebooks (3751) and PC-Systeme (3020), HAR 2026-10-14. */
const notebooks = parseSearchResult(fixture["3751"], categoryId("3751"));
const pcs = parseSearchResult(fixture["3020"], categoryId("3020"));

const numeric = (groups: FacetGroup[], name: string) => {
  const group = groups.find((g) => g.group.name === name);
  if (group?.kind !== "numeric") throw new Error(`${name} is not a numeric facet`);
  return group;
};
const intervalOf = (groups: FacetGroup[], name: string, label: string): Interval | null => {
  const option = numeric(groups, name).options.find((o) => o.label === label);
  if (option === undefined) throw new Error(`${label} missing in ${name}`);
  return option.interval;
};
const span = (min: number, max: number, maxExclusive = false): Interval => ({
  min,
  max,
  maxExclusive,
});

describe("facetsOf", () => {
  const nb = facetsOf(notebooks.catalog);
  const pc = facetsOf(pcs.catalog);

  it("names the same facet across categories whatever the attribute id", () => {
    const ramNb = numeric(nb, "RAM");
    const ramPc = numeric(pc, "RAM");
    expect([ramNb.facet, ramNb.group.attributeId]).toEqual(["ram_gb", "27570"]);
    expect([ramPc.facet, ramPc.group.attributeId]).toEqual(["ram_gb", "19537"]);
    expect(pc.find((g) => g.group.name === "Prozessor")).toMatchObject({
      kind: "model",
      facet: "cpu_model",
    });
    expect(pc.find((g) => g.group.name === "RAM Typ")).toMatchObject({
      kind: "label",
      facet: "ram_type",
    });
    expect(nb.some((g) => g.group.name === "Serie")).toBe(false);
  });

  it("parses every measure label of the real groups", () => {
    const unparsed = [...nb, ...pc].flatMap((g) =>
      g.kind === "numeric"
        ? g.options.filter((o) => o.interval === null).map((o) => `${g.group.name}: ${o.label}`)
        : [],
    );
    expect(unparsed).toEqual(["Grafikspeicher: Shared Memory"]);
  });

  it("reads exact values, ranges, open bounds, units and core words", () => {
    expect(intervalOf(nb, "RAM", "32 GB")).toEqual(span(32, 32));
    expect(intervalOf(pc, "SSD-Speicher", "1 TB")).toEqual(span(1000, 1000));
    expect(intervalOf(pc, "SSD-Speicher", "bis 128 GB")).toEqual(span(0, 128));
    expect(intervalOf(nb, "Akkulaufzeit", "8 bis 10 h")).toEqual(span(8, 10));
    expect(intervalOf(nb, "Gewicht", "ab 2,5 kg")).toEqual(span(2.5, Number.POSITIVE_INFINITY));
    expect(intervalOf(nb, "Helligkeit", "320 bis 430 cd/m²")).toEqual(span(320, 430));
    expect(intervalOf(pc, "Anzahl Prozessorkerne", "Quad-Core")).toEqual(span(4, 4));
    expect(intervalOf(pc, "Speichertakt", "ab 6400 MHz")).toEqual(
      span(6400, Number.POSITIVE_INFINITY),
    );
    expect(intervalOf(nb, "Markteinführung", "2024")).toEqual(span(2024, 2024));
  });

  it("treats display sizes as buckets up to the next listed size", () => {
    expect(intervalOf(nb, "Displaygröße", "14 Zoll")).toEqual(span(14, 15, true));
  });

  it("selects options that guarantee a bound", () => {
    const atLeast32 = numeric(nb, "RAM")
      .options.filter((o) => o.interval !== null && allAtLeast(o.interval, 32))
      .map((o) => o.label);
    expect(atLeast32).toEqual(["32 GB", "36 GB", "40 GB", "48 GB", "64 GB", "96 GB", "128 GB"]);
    const lighterThan2 = numeric(nb, "Gewicht")
      .options.filter((o) => o.interval !== null && allAtMost(o.interval, 2))
      .map((o) => o.label);
    expect(lighterThan2).toEqual(["bis 1 kg", "1 bis 1,5 kg", "1,5 bis 2 kg"]);
  });
});
