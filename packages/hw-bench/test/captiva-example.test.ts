import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createCanonicalKeyMatcher,
  createGpuMatcher,
  extractCpuIdentity,
  parseSpecBlock,
  passmarkCpuSource,
  passmarkGpuSource,
  productContextFromSpecs,
} from "../src";

/** "Produktdetails" block copied from an idealo product page (tab-separated label/value lines). */
const specText = readFileSync(
  resolve(import.meta.dirname, "fixtures/captiva-r10-1257ge.spec.txt"),
  "utf8",
);
const title = "Captiva Highend Gaming R10-1257GE";

describe("Captiva R10-1257GE spec block", () => {
  const context = productContextFromSpecs(parseSpecBlock(specText), { title });

  it("yields CPU, GPU and the notebook form factor", () => {
    expect(context).toEqual({
      cpuText: "Intel Core Ultra 9 275HX",
      gpuText: "NVIDIA GeForce RTX 5080",
      formFactor: "laptop",
    });
  });

  const dataDir = resolve(import.meta.dirname, "../../../data");
  const cpuPath = resolve(dataDir, "passmark_cpu.json");
  const gpuPath = resolve(dataDir, "passmark_gpu.csv");

  it.skipIf(!existsSync(cpuPath) || !existsSync(gpuPath))(
    "matches deterministically on PassMark data, laptop GPU variant included",
    () => {
      const cpu = createCanonicalKeyMatcher(passmarkCpuSource.parse(readFileSync(cpuPath, "utf8")));
      const gpu = createGpuMatcher(passmarkGpuSource.parse(readFileSync(gpuPath, "utf8")));
      const identity = extractCpuIdentity(context.cpuText ?? "");
      if (identity === null) throw new Error("no CPU identity in spec block");
      const cpuMatch = cpu.match(identity);
      const gpuMatch = gpu.match(context.gpuText ?? "", { formFactor: context.formFactor });
      expect(cpuMatch.status === "matched" && cpuMatch.record.name).toBe(
        "Intel Core Ultra 9 275HX",
      );
      expect(gpuMatch.status === "matched" && gpuMatch.record.name).toBe(
        "GeForce RTX 5080 Laptop GPU",
      );
    },
  );
});
