import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createCandidateIndex,
  createCanonicalKeyMatcher,
  createGpuMatcher,
  parseSpecBlock,
  passmarkCpuSource,
  passmarkGpuSource,
  productContextFromSpecs,
} from "@idealo-hw/hw-bench";
import { beforeAll, describe, expect, it } from "vitest";
import { createJevDecider, type Decider, resolveCpu, resolveGpu } from "../../src";

/**
 * Live checks against Jev through OpenRouter. They need the owner's OpenRouter key (OPENROUTER_API_KEY) and
 * the gitignored PassMark files in data/ (docs/adr/0006), so they skip in CI and in sandboxes without both.
 * The key is read here, in the test, and handed to the library; library code never touches the environment.
 */
const apiKey = process.env.OPENROUTER_API_KEY;
const dataDir = resolve(import.meta.dirname, "../../../../data");
const cpuPath = resolve(dataDir, "passmark_cpu.json");
const gpuPath = resolve(dataDir, "passmark_gpu.csv");

describe.skipIf(!apiKey || !existsSync(cpuPath) || !existsSync(gpuPath))("Jev live", () => {
  let decider: Decider;
  let cpuDeps: Parameters<typeof resolveCpu>[1];
  let gpuDeps: Parameters<typeof resolveGpu>[2];

  beforeAll(() => {
    const cpus = passmarkCpuSource.parse(readFileSync(cpuPath, "utf8"));
    const gpus = passmarkGpuSource.parse(readFileSync(gpuPath, "utf8"));
    decider = createJevDecider({ apiKey: apiKey ?? "" });
    cpuDeps = {
      matcher: createCanonicalKeyMatcher(cpus),
      candidates: createCandidateIndex(cpus.records, { nameOf: (r) => r.name }),
      decider,
    };
    gpuDeps = {
      matcher: createGpuMatcher(gpus),
      candidates: createCandidateIndex(gpus.records, { nameOf: (r) => r.name }),
      decider,
    };
  });

  it("resolves the OneXPlayer title to Ryzen AI Max+ 395, not the Pro near-miss", async () => {
    const title = 'OneXPlayer Super X 14" Tablet & Laptop 2-In-1 AI MAX+ 395 Water Cooled Version';
    const result = await resolveCpu(title, { ...cpuDeps, context: { product_title: title } });
    expect(cpuDeps.matcher.match(title).status).toBe("no_match");
    expect(result.status).toBe("matched");
    expect(result.source).toBe("jev");
    expect(result.record?.name).toBe("AMD Ryzen AI Max+ 395");
    expect(result.model).toMatch(/^typesafe\/jev-1\.13/);
  }, 60_000);

  it("resolves the GPU of a desktop spec block", async () => {
    // Hand-written block in idealo's shape. It has no PC-Typ line; the title says "Gaming PC".
    const title = "Captiva Highend Gaming I80-123 Gaming PC";
    const specs = parseSpecBlock(
      "Prozessor\tAMD Ryzen 7 7800X3D\nGrafikkarte\tNVIDIA GeForce RTX 5070 Ti (16GB)\nArbeitsspeicher\t32 GB",
    );
    const context = productContextFromSpecs(specs, { title });
    expect(context.gpuText).toBe("NVIDIA GeForce RTX 5070 Ti (16GB)");
    expect(context.formFactor).toBe("desktop");
    const gpuText = context.gpuText ?? "";
    const rules = await resolveGpu(gpuText, context.formFactor, gpuDeps);
    expect(rules.source).toBe("deterministic");
    expect(rules.record?.name).toBe("GeForce RTX 5070 Ti");

    // Without a form factor the rules see two variants; Jev gets the title as context and must pick desktop.
    const result = await resolveGpu(gpuText, "unknown", {
      ...gpuDeps,
      context: { product_title: title },
    });
    expect(result.source).toBe("jev");
    expect(result.record?.name).toBe("GeForce RTX 5070 Ti");
  }, 60_000);
});
