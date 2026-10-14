import type { IgpuRule } from "../../model";

/** Rules for: rembrandt, mendocino, barcelo. */
export const AMD_REMBRANDT_TO_BARCELO_RULES: readonly IgpuRule[] = [
  {
    id: "amd-rembrandt-680m",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 7", "Ryzen 9"],
      numberIn: [6800, 6850, 6900, 6980, 7735, 7736],
      suffixIn: ["U", "H", "HS", "HX"],
    },
    igpu: { kind: "passmark", name: "Radeon 680M" },
    caveat: "low_samples=true",
    evidence: [
      "https://www.notebookcheck.net/AMD-Ryzen-7-PRO-6850U-Processor-Benchmarks-and-Specs.615519.0.html",
      "https://www.notebookcheck.net/R5-PRO-6650U-vs-R7-7735U-vs-R7-PRO-6850U_14384_14962_14382.247596.0.html",
      "https://www.notebookcheck.net/Radeon-660M-vs-Radeon-680M_11126_11124.247598.0.html",
    ],
    confidence: 0.9,
  },
  {
    id: "amd-rembrandt-660m",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 5", "Ryzen 3"],
      numberIn: [6600, 6650, 7335, 7535],
      suffixIn: ["U", "H", "HS"],
    },
    igpu: { kind: "passmark", name: "Radeon 660M" },
    caveat: "low_samples=true",
    evidence: [
      "https://www.notebookcheck.net/R5-PRO-6650U-vs-R7-7735U-vs-R7-PRO-6850U_14384_14962_14382.247596.0.html",
      "https://www.notebookcheck.net/Radeon-660M-vs-Radeon-680M_11126_11124.247598.0.html",
      "https://www.notebookcheck.net/AMD-Ryzen-5-130-Processor-Benchmarks-and-Specs.1149193.0.html",
    ],
    confidence: 0.9,
  },
  {
    id: "amd-mendocino-610m",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Athlon Silver", "Athlon Gold"],
      numberIn: [7120, 7220, 7320, 7520],
      suffixIn: ["U"],
    },
    igpu: { kind: "passmark", name: "Radeon 610M" },
    caveat: "",
    evidence: [
      "https://www.amd.com/en/products/processors/laptop/ryzen/7000-series/amd-ryzen-3-7320u.html",
      "https://www.notebookcheck.net/AMD-Ryzen-5-7520U-Processor-Benchmarks-and-Specs.654934.0.html",
      "https://www.notebookcheck.net/AMD-Ryzen-5-7520U-Ryzen-3-7320U-and-Athlon-Gold-7220U-Mendocino-processors-unveiled-for-entry-level-thin-and-light-laptops.654149.0.html",
    ],
    confidence: 0.93,
  },
  {
    id: "amd-barcelo-r-vega8",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [7730],
      suffixIn: ["U"],
    },
    igpu: { kind: "passmark", name: "Radeon Vega 8" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Cezanne-benchmarks-Ryzen-5000H-45-watt-APUs-with-Zen-3.516895.0.html",
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-8-Ryzen-4000-5000-GPU-Benchmarks-and-Specs.453150.0.html",
    ],
    confidence: 0.7,
  },
  {
    id: "amd-barcelo-r-vega7",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [7430, 7530],
      suffixIn: ["U"],
    },
    igpu: { kind: "passmark", name: "Radeon Vega 8" },
    caveat:
      "proxy_row=true; reason=no PassMark row for Vega 7 (7 CU), nearest is Vega 8 (8 CU); cpu_named_rows_exist='Ryzen N NNNN with Radeon Graphics'",
    evidence: [
      "https://www.notebookcheck.net/AMD-Cezanne-benchmarks-Ryzen-5000H-45-watt-APUs-with-Zen-3.516895.0.html",
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-7-Graphics-Card-Benchmarks-and-Specs.450004.0.html",
    ],
    confidence: 0.6,
  },
  {
    id: "amd-barcelo-r-vega6",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [7330],
      suffixIn: ["U"],
    },
    igpu: { kind: "passmark", name: "Radeon Vega 6" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Cezanne-benchmarks-Ryzen-5000H-45-watt-APUs-with-Zen-3.516895.0.html",
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-6-Ryzen-4000-GPU-Benchmarks-and-Specs.453149.0.html",
    ],
    confidence: 0.65,
  },
];
