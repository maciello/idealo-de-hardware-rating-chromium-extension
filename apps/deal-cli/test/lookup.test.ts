import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createBenchmarkLookup } from "../src/lookup";
import { loadSnapshots } from "../src/passmark";
import { fixture } from "./paths";

const snapshots = loadSnapshots(fixture("passmark"));
const lookup = createBenchmarkLookup(snapshots.cpu, snapshots.gpu);

describe("benchmark lookup over synthetic PassMark rows", () => {
  it("loads both files without skipped rows", () => {
    expect(snapshots.warnings).toEqual([]);
    expect(readFileSync(join(fixture("passmark"), "passmark_cpu.csv"), "utf8")).toContain(
      "cpumark",
    );
  });
  it("matches a CPU by name", () => {
    expect(lookup.cpu("Intel Core i5-1335U")).toMatchObject({ cpu_mark: 14000, cpu_single: 3300 });
    expect(lookup.cpu("Intel Core i9-99999")).toBeNull();
  });
  it("uses the lower bound of an ambiguous match and notes it", () => {
    const found = lookup.cpu("Apple M4 Pro");
    expect(found).toMatchObject({ cpu_mark: 28000, cpu_single: 3900, samples: 200 });
    expect(found?.note).toMatch(/ambiguous/);
  });
  it("takes a dedicated card from the GPU text", () => {
    expect(lookup.gpu("NVIDIA GeForce RTX 4060 Laptop GPU", "AMD Ryzen 7 7840HS")).toMatchObject({
      g3d_mark: 17000,
      integrated: false,
    });
  });
  it("resolves generic labels through the CPU's integrated GPU", () => {
    expect(lookup.gpu("AMD Radeon Graphics", "AMD Ryzen 7 7840HS")).toMatchObject({
      matched: "Radeon 780M",
      integrated: true,
    });
    expect(lookup.gpu("", "Intel Core i5-1335U")).toMatchObject({ matched: "Intel Iris Xe" });
  });
  it("answers null without snapshots", () => {
    const empty = createBenchmarkLookup(null, null);
    expect(empty.cpu("Intel Core i5-1335U")).toBeNull();
    expect(empty.gpu("x", null)).toBeNull();
  });
});
