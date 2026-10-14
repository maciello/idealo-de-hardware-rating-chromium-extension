import type { IgpuRule } from "../../model";

/** Rules for: raven, embedded. */
export const AMD_RAVEN_TO_EMBEDDED_RULES: readonly IgpuRule[] = [
  {
    id: "amd-raven-picasso-vega10",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [2700, 3700, 3750],
      suffixIn: ["U", "H"],
    },
    igpu: { kind: "passmark", name: "Radeon RX Vega 10" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-8-Ryzen-4000-5000-GPU-Benchmarks-and-Specs.453150.0.html",
    ],
    confidence: 0.7,
  },
  {
    id: "amd-raven-picasso-vega8",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [2500, 3450, 3500, 3550],
      suffixIn: ["U", "H"],
    },
    igpu: { kind: "passmark", name: "Radeon Vega 8" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-8-Ryzen-4000-5000-GPU-Benchmarks-and-Specs.453150.0.html",
    ],
    confidence: 0.7,
  },
  {
    id: "amd-raven-picasso-vega6",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [2300, 3300, 3350],
      suffixIn: ["U"],
    },
    igpu: { kind: "passmark", name: "Radeon Vega 6" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-6-Ryzen-4000-GPU-Benchmarks-and-Specs.453149.0.html",
    ],
    confidence: 0.65,
  },
  {
    id: "amd-picasso-dali-vega3",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [3200, 3250],
      suffixIn: ["U"],
    },
    igpu: { kind: "passmark", name: "Radeon Vega 3" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-6-Ryzen-4000-GPU-Benchmarks-and-Specs.453149.0.html",
    ],
    confidence: 0.6,
  },
  {
    id: "amd-athlon-3020e-vega-3",
    match: { labelKeyIn: ["amd-3020e"] },
    igpu: { kind: "passmark", name: "Radeon Vega 3 3020e" },
    caveat: "passmark_row_is_cpu_named=true",
    evidence: [
      "https://www.notebookcheck.com/AMD-3020e-Prozessor-Benchmarks-und-Specs.484462.0.html",
    ],
    confidence: 0.8,
  },
  {
    id: "amd-embedded-r2314-vega6",
    match: { labelKeyIn: ["amd-ryzen-embedded-r2314"] },
    igpu: { kind: "passmark", name: "Radeon Vega 6" },
    caveat: "",
    evidence: ["https://www.portwell.tw/?p=180832"],
    confidence: 0.7,
  },
  {
    id: "amd-embedded-v2546-vega6",
    match: { labelKeyIn: ["amd-ryzen-embedded-v2546"] },
    igpu: { kind: "passmark", name: "Radeon Vega 6" },
    caveat: "",
    evidence: ["https://en.wikichip.org/wiki/Ryzen_Embedded_V2546"],
    confidence: 0.75,
  },
];
