import { type FacetOption, facetsOf } from "@idealo-hw/idealo-query";
import { describe, expect, it } from "vitest";
import { NUMERIC_CONTROLS } from "../../../../src/features/requirements/config";
import { numericSliderModel } from "../../../../src/features/requirements/view-model/numeric-slider";
import { priceSliderModel } from "../../../../src/features/requirements/view-model/price-slider";
import { ramTypeModel } from "../../../../src/features/requirements/view-model/ram-type";
import { scoreSliderModel } from "../../../../src/features/requirements/view-model/score-slider";
import { catalog, group } from "../catalog-fixtures";

const control = (facet: string) => {
  const found = NUMERIC_CONTROLS.find((c) => c.facet === facet);
  if (found === undefined) throw new Error(facet);
  return found;
};
const optionsOf = (name: string, labels: string[]): FacetOption[] => {
  const [facet] = facetsOf(catalog(group(name, labels)));
  return facet?.kind === "numeric" ? [...facet.options] : [];
};

describe("numericSliderModel", () => {
  const ram = optionsOf("RAM", ["8 GB", "16 GB", "32 GB"]);

  it("snaps a minimum to a listed value and says so in its text", () => {
    const model = numericSliderModel(control("ram_gb"), ram, { min: 12 }, undefined);
    expect(model).toMatchObject({ kind: "single", label: "RAM ≥", valueText: "16 GB", value: 16 });
  });

  it("reads 'any' at the unrestricted end and clears the bound when dragged there", () => {
    const model = numericSliderModel(control("ram_gb"), ram, undefined, undefined);
    expect(model).toMatchObject({ valueText: "any", value: 8 });
    expect(model?.kind === "single" && model.toBound(8)).toEqual({});
    expect(model?.kind === "single" && model.toBound(32)).toEqual({ min: 32 });
  });

  it("offers a range for display size with from/to thumbs", () => {
    const sizes = optionsOf("Displaygröße", ["13 Zoll", "14 Zoll", "15 Zoll", "17 Zoll"]);
    const model = numericSliderModel(control("display_inch"), sizes, { min: 14 }, undefined);
    expect(model).toMatchObject({ kind: "range", valueText: "≥ 14 Zoll", value: [14, 17] });
    expect(model?.kind === "range" && model.toBound([13, 15])).toEqual({ max: 15 });
  });

  it("has nothing to slide with fewer than two values", () => {
    const one = optionsOf("RAM", ["8 GB"]);
    expect(numericSliderModel(control("ram_gb"), one, undefined, undefined)).toBeNull();
  });
});

describe("scoreSliderModel", () => {
  const input = {
    id: "cpu_mark",
    metric: "cpu_mark",
    label: "CPU",
    span: { min: 1200, max: 5100 },
    step: 500,
  } as const;

  it("rounds the span out to the step and treats the lowest end as no minimum", () => {
    const model = scoreSliderModel({ ...input, value: undefined, status: null });
    expect(model).toMatchObject({ min: 1000, max: 5500, valueText: "any", fieldLabel: "CPU ≥" });
    expect(model?.toMinimum(1000)).toBeUndefined();
    expect(model?.toMinimum(3000)).toBe(3000);
  });

  it("clamps a stored minimum into the span and formats it de-DE", () => {
    const model = scoreSliderModel({ ...input, value: 9000, status: null });
    expect(model).toMatchObject({ current: 5500, valueText: "5.500" });
  });

  it("is absent when the span is flat", () => {
    const flat = { ...input, span: { min: 1000, max: 1000 } };
    expect(scoreSliderModel({ ...flat, value: undefined, status: null })).toBeNull();
  });
});

describe("priceSliderModel", () => {
  it("steps by 10 on a narrow result set and 50 on a wide one", () => {
    expect(priceSliderModel({ min: 405, max: 1295 }, undefined)).toMatchObject({
      min: 400,
      max: 1300,
      step: 10,
    });
    expect(priceSliderModel({ min: 400, max: 4000 }, undefined)).toMatchObject({ step: 50 });
  });

  it("describes the open and closed ends", () => {
    const bounds = { min: 400, max: 1300 };
    expect(priceSliderModel(bounds, undefined)?.valueText).toBe("any");
    expect(priceSliderModel(bounds, { max: 900 })?.valueText).toBe("up to 900 €");
    expect(priceSliderModel(bounds, { min: 600 })?.valueText).toBe("from 600 €");
    expect(priceSliderModel(bounds, { min: 600, max: 900 })?.valueText).toBe("600 € – 900 €");
  });

  it("maps slider ends at the bounds to no limit", () => {
    const model = priceSliderModel({ min: 400, max: 1300 }, undefined);
    expect(model?.toPrice(400, 900)).toEqual({ max: 900 });
    expect(model?.toPrice(600, 1300)).toEqual({ min: 600 });
  });

  it("is absent when the bounds collapse", () => {
    expect(priceSliderModel({ min: 500, max: 500 }, undefined)).toBeNull();
  });
});

describe("ramTypeModel", () => {
  it("lists the category's own types newest generation first", () => {
    const model = ramTypeModel(["DDR4", "LPDDR5X", "DDR5"], ["DDR5"], undefined);
    expect(model).toMatchObject({
      available: true,
      labels: ["DDR5", "LPDDR5X", "DDR4"],
      selected: ["DDR5"],
    });
  });

  it("falls back to a disabled list with a note where there is no group", () => {
    const model = ramTypeModel([], ["DDR5"], undefined);
    expect(model.available).toBe(false);
    expect(model.selected).toEqual([]);
    expect(model.labels[0]).toBe("DDR5");
    expect(model.note).toBe("idealo has no RAM-type filter here");
  });
});
