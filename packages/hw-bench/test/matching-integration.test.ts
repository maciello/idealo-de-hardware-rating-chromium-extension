import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type CpuBenchmarkRecord,
  createCandidateIndex,
  createGpuMatcher,
  type GpuBenchmarkRecord,
  type GpuMatcher,
  passmarkCpuSource,
  passmarkGpuSource,
} from "../src";

/** Real PassMark exports live in the gitignored data/ dir (docs/adr/0006); these tests skip without them. */
const dataDir = resolve(import.meta.dirname, "../../../data");
const cpuJsonPath = resolve(dataDir, "passmark_cpu.json");
const gpuCsvPath = resolve(dataDir, "passmark_gpu.csv");

describe.skipIf(!existsSync(cpuJsonPath))("candidate index on PassMark CPUs", () => {
  let candidates: (text: string) => string[];

  beforeAll(() => {
    const snapshot = passmarkCpuSource.parse(readFileSync(cpuJsonPath, "utf8"));
    const index = createCandidateIndex<CpuBenchmarkRecord>(snapshot.records, {
      nameOf: (r) => r.name,
    });
    candidates = (text) => index.candidatesFor(text).map((c) => c.record.name);
  });

  it("finds the OneXPlayer CPU first and keeps the near-miss behind it", () => {
    const names = candidates(
      'OneXPlayer Super X 14" Tablet & Laptop 2-In-1 AI MAX+ 395 Water Cooled Version',
    );
    expect(names.slice(0, 2)).toEqual(["AMD Ryzen AI Max+ 395", "AMD Ryzen AI Max+ Pro 395"]);
  });

  it("finds clean names and ignores trailing spec noise", () => {
    expect(candidates("Intel Core Ultra 9 275HX")[0]).toBe("Intel Core Ultra 9 275HX");
    expect(candidates("Ryzen 7 8845HS 16GB")[0]).toBe("AMD Ryzen 7 8845HS");
  });
});

describe.skipIf(!existsSync(gpuCsvPath))("GPU matcher on PassMark GPUs", () => {
  let matcher: GpuMatcher;

  const resolveName = (text: string, formFactor: "laptop" | "desktop" | "unknown") => {
    const result = matcher.match(text, { formFactor });
    if (result.status === "matched") return result.record;
    if (result.status === "ambiguous") return result.candidates;
    return null;
  };

  beforeAll(() => {
    matcher = createGpuMatcher(passmarkGpuSource.parse(readFileSync(gpuCsvPath, "utf8")));
  });

  it("maps a notebook RTX 5080 to the Laptop GPU record, not the desktop card", () => {
    const record = resolveName("NVIDIA GeForce RTX 5080", "laptop") as GpuBenchmarkRecord;
    expect(record.name).toBe("GeForce RTX 5080 Laptop GPU");
    expect(record.segments).toContain("mobile");
    expect(record.g3dMark).toBeLessThan(
      (resolveName("NVIDIA GeForce RTX 5080", "desktop") as GpuBenchmarkRecord).g3dMark,
    );
  });

  it("maps a desktop RTX 5080 to the plain record", () => {
    expect((resolveName("NVIDIA GeForce RTX 5080", "desktop") as GpuBenchmarkRecord).name).toBe(
      "GeForce RTX 5080",
    );
  });

  it("is ambiguous between both RTX 5080 variants when the form factor is unknown", () => {
    const candidates = resolveName("NVIDIA GeForce RTX 5080", "unknown") as GpuBenchmarkRecord[];
    expect(candidates.map((c) => c.name)).toEqual([
      "GeForce RTX 5080",
      "GeForce RTX 5080 Laptop GPU",
    ]);
  });

  it("keeps the integrated Radeon 8060S, which has no Laptop variant", () => {
    const record = resolveName("AMD Radeon 8060S", "laptop") as GpuBenchmarkRecord;
    expect(record.name).toBe("Radeon 8060S");
    expect(record.segments).toContain("desktop");
  });

  it("strips the memory size from 'NVIDIA GeForce RTX 4060 (8GB)'", () => {
    expect(
      (resolveName("NVIDIA GeForce RTX 4060 (8GB)", "laptop") as GpuBenchmarkRecord).name,
    ).toBe("GeForce RTX 4060 Laptop GPU");
    expect(
      (resolveName("NVIDIA GeForce RTX 4060 (8GB)", "desktop") as GpuBenchmarkRecord).name,
    ).toBe("GeForce RTX 4060");
  });

  it("matches every PassMark name that is a recognised GPU back to itself", () => {
    const snapshot = passmarkGpuSource.parse(readFileSync(gpuCsvPath, "utf8"));
    const failures = snapshot.records.filter((record) => {
      const laptop = record.segments.includes("mobile") && !record.segments.includes("desktop");
      const result = matcher.match(record.name, { formFactor: laptop ? "laptop" : "desktop" });
      // Names no extractor recognises are legitimately matched by whole-name fallback or not at all.
      return result.status === "matched" && result.record.id !== record.id;
    });
    expect(failures.map((r) => r.name)).toEqual([]);
  });
});
