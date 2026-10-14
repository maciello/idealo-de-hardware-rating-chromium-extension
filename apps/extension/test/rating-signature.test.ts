import { passmarkCpuSource } from "@idealo-hw/hw-bench";
import { describe, expect, it } from "vitest";
import { createRatingEngine, STRATEGY_CATALOG } from "../src/ratings/engine";
import { createGpuEngine } from "../src/ratings/gpu-engine";
import { signatureOf } from "../src/ratings/signature";
import { GPU_SPECS, gpuSnapshotOf } from "./gpu-snapshot";

const cpus = passmarkCpuSource.parse(
  JSON.stringify({
    data: [
      { id: "1", name: "Intel Core i7-13700H", cpumark: "28,000", thread: "3,700", cat: "Laptop" },
    ],
  }),
);
const cpuEngine = createRatingEngine(
  cpus,
  STRATEGY_CATALOG.map((s) => s.id),
);
const gpuEngine = createGpuEngine(gpuSnapshotOf(...GPU_SPECS));

const query = { title: "Intel Core i7-13700H Notebook", text: "", formFactor: "laptop" } as const;
const [cpu] = cpuEngine.rate([query]);
if (!cpu) throw new Error("expected a CPU rating");
const gpuFor = (text: string, formFactor: "laptop" | "desktop" = "laptop") =>
  gpuEngine.rate([{ ...query, text, formFactor }])[0] ?? null;

describe("signatureOf", () => {
  it("is stable for identical input", () => {
    expect(signatureOf(cpu, gpuFor("NVIDIA GeForce RTX 4060"))).toBe(
      signatureOf(cpu, gpuFor("NVIDIA GeForce RTX 4060")),
    );
  });

  it("changes when a GPU appears or disappears", () => {
    const without = signatureOf(cpu, null);
    expect(signatureOf(cpu, gpuFor("NVIDIA GeForce RTX 4060"))).not.toBe(without);
  });

  it("changes with the matched GPU", () => {
    expect(signatureOf(cpu, gpuFor("NVIDIA GeForce RTX 4060"))).not.toBe(
      signatureOf(cpu, gpuFor("NVIDIA GeForce RTX 5060")),
    );
  });

  it("changes with the GPU percentile when the match stays the same", () => {
    const laptop = signatureOf(cpu, gpuFor("NVIDIA GeForce RTX 4060"));
    const base = gpuFor("NVIDIA GeForce RTX 4060");
    if (!base?.primary.rating) throw new Error("expected a GPU match");
    const { rating } = base.primary;
    const shifted = {
      ...base,
      primary: {
        ...base.primary,
        rating: {
          ...rating,
          ratings: rating.ratings.map((r) =>
            r.strategyId === "gpu_g3d_percentile" ? { ...r, value: r.value - 20 } : r,
          ),
        },
      },
    };
    expect(signatureOf(cpu, shifted)).not.toBe(laptop);
  });

  it("changes with the GPU line's kind, memory and companion iGPU", () => {
    const card = signatureOf(cpu, gpuFor("NVIDIA GeForce RTX 5060"));
    expect(signatureOf(cpu, gpuFor("NVIDIA GeForce RTX 5060, Grafikspeicher 16 GB"))).not.toBe(
      card,
    );
    // The title names the CPU, so a tile without a card gets its iGPU on the line instead.
    expect(signatureOf(cpu, gpuFor("16 GB RAM"))).not.toBe(card);
    expect(signatureOf(cpu, gpuFor("Intel Core i7-13700H"))).not.toBe(
      signatureOf(cpu, gpuFor("Intel Core Ultra 7 258V")),
    );
  });

  it("tells an unrated iGPU from a rated one", () => {
    expect(signatureOf(cpu, gpuFor("Apple M3"))).not.toBe(
      signatureOf(cpu, gpuFor("Intel Core i7-13700H")),
    );
  });

  it("changes with the page form factor, which picks the GPU's comparison group", () => {
    expect(signatureOf(cpu, gpuFor("NVIDIA GeForce RTX 4060", "laptop"))).not.toBe(
      signatureOf(cpu, gpuFor("NVIDIA GeForce RTX 4060", "desktop")),
    );
  });

  it("still tells CPU outcomes apart without a GPU", () => {
    expect(signatureOf(cpu, null)).not.toBe(signatureOf({ status: "no_match" }, null));
  });
});
