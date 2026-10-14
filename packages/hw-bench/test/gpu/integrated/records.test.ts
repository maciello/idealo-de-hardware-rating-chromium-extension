import { describe, expect, it } from "vitest";
import { createGpuNameLookup, passmarkGpuSource } from "../../../src";

const snapshot = passmarkGpuSource.parse(
  JSON.stringify({
    data: [
      { id: "1", name: "Radeon 780M", g3d: "6700", cat: "Mobile", samples: "10" },
      { id: "2", name: "Radeon 780M", g3d: "6800", cat: "Mobile", samples: "900" },
      { id: "3", name: "Intel Iris Xe", g3d: "2500", cat: "Unknown", samples: "50" },
    ],
  }),
);

describe("createGpuNameLookup", () => {
  const lookup = createGpuNameLookup(snapshot.records);

  it("finds a row by its exact name", () => {
    expect(lookup("Intel Iris Xe")?.id).toBe(3);
  });

  it("prefers the best-sampled row among duplicates of one name", () => {
    expect(lookup("Radeon 780M")?.id).toBe(2);
  });

  it("is null for a name the snapshot lacks, and does not match loosely", () => {
    expect(lookup("Radeon 760M")).toBeNull();
    expect(lookup("radeon 780m")).toBeNull();
  });
});
