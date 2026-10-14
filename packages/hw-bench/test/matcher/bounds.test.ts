import { describe, expect, it } from "vitest";
import { createGpuMatcher } from "../../src";
import { passmarkGpuSource } from "../../src/benchmark";
import { cpuScoreBounds, createCanonicalKeyMatcher, gpuScoreBounds } from "../../src/matcher";
import { asJson, cpuRow, cpuSnapshotOf, gpuRow } from "../fixtures";

describe("cpuScoreBounds", () => {
  const matcher = createCanonicalKeyMatcher(
    cpuSnapshotOf(
      cpuRow({ name: "Apple M9 Pro 12 Core", cpumark: "30,000", thread: "4,000" }),
      cpuRow({ name: "Apple M9 Pro 14 Core", cpumark: "34,000", thread: "4,100" }),
      cpuRow({ name: "Apple M9 Max 14 Core", cpumark: "35,000", thread: "NA" }),
      cpuRow({ name: "Apple M9 Max 16 Core", cpumark: "40,000", thread: "4,200" }),
      cpuRow({ name: "Intel Core i7-13700H", cpumark: "28,000", thread: "3,800" }),
    ),
  );

  it("spans every variant of an ambiguous family", () => {
    expect(cpuScoreBounds(matcher.match("Apple M9 Pro"))).toEqual({
      variants: ["Apple M9 Pro 12 Core", "Apple M9 Pro 14 Core"],
      cpuMark: { min: 30_000, max: 34_000 },
      singleThread: { min: 4_000, max: 4_100 },
    });
  });

  it("returns min = max for a single match", () => {
    expect(cpuScoreBounds(matcher.match("Apple M9 Pro 14-Core"))).toEqual({
      variants: ["Apple M9 Pro 14 Core"],
      cpuMark: { min: 34_000, max: 34_000 },
      singleThread: { min: 4_100, max: 4_100 },
    });
    expect(cpuScoreBounds(matcher.match("Intel Core i7-13700H"))?.cpuMark).toEqual({
      min: 28_000,
      max: 28_000,
    });
  });

  it("gives no single-thread range when a variant lacks the score", () => {
    const bounds = cpuScoreBounds(matcher.match("Apple M9 Max"));
    expect(bounds?.cpuMark).toEqual({ min: 35_000, max: 40_000 });
    expect(bounds?.singleThread).toBeNull();
  });

  it("returns null without a match", () => {
    expect(cpuScoreBounds(matcher.match("Apple M1"))).toBeNull();
    expect(cpuScoreBounds({ status: "ambiguous", candidates: [] })).toBeNull();
  });
});

describe("gpuScoreBounds", () => {
  const matcher = createGpuMatcher(
    passmarkGpuSource.parse(
      asJson([
        gpuRow({ id: "1", name: "GeForce RTX 9070 Ti 8GB", g3d: "30,001" }),
        gpuRow({ id: "2", name: "GeForce RTX 9070 Ti 16GB", g3d: "31,002" }),
        gpuRow({ id: "3", name: "GeForce RTX 9060", g3d: "19,003" }),
        gpuRow({ id: "4", name: "GeForce RTX 9060 Laptop GPU", g3d: "17,004", cat: "Mobile" }),
      ]),
    ),
  );

  it("spans the memory variants of a model", () => {
    expect(gpuScoreBounds(matcher.match("NVIDIA GeForce RTX 9070 Ti"))).toEqual({
      variants: ["GeForce RTX 9070 Ti 16GB", "GeForce RTX 9070 Ti 8GB"],
      g3dMark: { min: 30_001, max: 31_002 },
    });
  });

  it("spans laptop and desktop records when the form factor is unknown, and narrows with it", () => {
    expect(gpuScoreBounds(matcher.match("NVIDIA GeForce RTX 9060"))?.g3dMark).toEqual({
      min: 17_004,
      max: 19_003,
    });
    expect(
      gpuScoreBounds(matcher.match("NVIDIA GeForce RTX 9060", { formFactor: "laptop" }))?.g3dMark,
    ).toEqual({ min: 17_004, max: 17_004 });
  });

  it("returns null without a match", () => {
    expect(gpuScoreBounds(matcher.match("NVIDIA GeForce RTX 9999"))).toBeNull();
  });
});
