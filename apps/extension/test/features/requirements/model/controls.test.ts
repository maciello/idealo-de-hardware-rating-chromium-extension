import { facetsOf } from "@idealo-hw/idealo-query";
import { describe, expect, it } from "vitest";
import { axisOf, snapDown, snapUp } from "../../../../src/features/requirements/model";
import { catalog, group } from "../catalog-fixtures";

const optionsOf = (name: string, labels: string[]) => {
  const [facet] = facetsOf(catalog(group(name, labels)));
  return facet?.kind === "numeric" ? facet.options : [];
};

describe("axisOf", () => {
  it("lists the snap values of a minimum slider from the options' lower ends", () => {
    const options = optionsOf("RAM", ["8 GB", "16 GB", "32 GB", "64 GB", "Shared Memory"]);
    expect(axisOf(options, "min")).toEqual([8, 16, 32, 64]);
  });

  it("reads TB labels as GB and drops the zero of 'bis' labels", () => {
    const options = optionsOf("SSD-Speicher", ["bis 256 GB", "512 GB", "1 TB", "2 TB"]);
    expect(axisOf(options, "min")).toEqual([512, 1000, 2000]);
  });

  it("uses finite upper ends for a maximum slider", () => {
    const options = optionsOf("Gewicht", ["bis 1 kg", "1,4 kg", "1,8 kg", "ab 2,5 kg"]);
    expect(axisOf(options, "max")).toEqual([1, 1.4, 1.8]);
  });

  it("joins both ends for a range, so a bucket ends where the next starts", () => {
    const options = optionsOf("Displaygröße", ["13 Zoll", "14 Zoll", "15 Zoll", "17 Zoll"]);
    expect(axisOf(options, "range")).toEqual([13, 14, 15, 17]);
  });
});

describe("snapping", () => {
  const axis = [8, 16, 32, 64];
  it("snaps a stored bound to the stricter listed value", () => {
    expect(snapUp(axis, 12)).toBe(16);
    expect(snapUp(axis, 100)).toBe(64);
    expect(snapDown(axis, 20)).toBe(16);
    expect(snapDown(axis, 1)).toBe(8);
  });
});
