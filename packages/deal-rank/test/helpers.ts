import type { z } from "zod";
import {
  type BenchmarkLookup,
  type Candidate,
  CandidateSchema,
  type Wants,
  WantsSchema,
} from "../src";

type CandidateInput = Partial<z.input<typeof CandidateSchema>>;
type WantsInput = Partial<z.input<typeof WantsSchema>>;

export const offer = (overrides: Partial<Candidate["offers"][number]> = {}) => ({
  shop: "Shop A",
  price_eur: 900,
  shipping_eur: 0,
  rating_avg: 4.6,
  rating_count: 1200,
  marketplace: false,
  payments: ["INV", "PP"],
  ...overrides,
});

export const candidate = (overrides: CandidateInput = {}): Candidate =>
  CandidateSchema.parse({
    sku: "SKU1",
    name: "Testbook One",
    url: "https://www.idealo.de/preisvergleich/OffersOfProduct/1.html",
    found_by: ["cheap"],
    fetched_at: "2026-11-01",
    offers: [offer()],
    ...overrides,
  });

export const wants = (overrides: WantsInput = {}): Wants =>
  WantsSchema.parse({ budget_eur: { max: 2000 }, ...overrides });

/** Benchmarks by exact cpu text; gpu text containing "RTX" is dedicated, anything else integrated. */
export const lookupOf = (
  cpus: Readonly<Record<string, { mark: number; single?: number; samples?: number }>>,
): BenchmarkLookup => ({
  cpu: (name) => {
    const found = cpus[name];
    return found === undefined
      ? null
      : {
          cpu_mark: found.mark,
          cpu_single: found.single ?? null,
          samples: found.samples ?? 500,
          matched: name,
        };
  },
  gpu: (gpu) =>
    gpu === ""
      ? null
      : {
          g3d_mark: gpu.includes("RTX") ? 15000 : 2000,
          samples: 400,
          matched: gpu,
          integrated: !gpu.includes("RTX"),
        },
});
