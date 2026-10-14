import type { IgpuRule } from "../../model";

/** Rules for: ryzen-100-200, phoenix. */
export const AMD_RYZEN_100_200_TO_PHOENIX_RULES: readonly IgpuRule[] = [
  {
    id: "amd-ryzen100-660m",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [130, 150],
    },
    igpu: { kind: "passmark", name: "Radeon 660M" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Ryzen-5-130-Processor-Benchmarks-and-Specs.1149193.0.html",
      "https://www.notebookcheck.net/AMD-Ryzen-5-150-Processor-Benchmarks-and-Specs.1149196.0.html",
    ],
    confidence: 0.88,
  },
  {
    id: "amd-ryzen100-680m",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [170],
    },
    igpu: { kind: "passmark", name: "Radeon 680M" },
    caveat: "low_samples=true",
    evidence: [
      "https://www.notebookcheck.com/AMD-Ryzen-7-170-Prozessor-Benchmarks-und-Specs.1148246.0.html",
    ],
    confidence: 0.85,
  },
  {
    id: "amd-ryzen200-780m",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [250, 255, 260, 270],
    },
    igpu: { kind: "passmark", name: "Radeon 780M" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Ryzen-9-270-Processor-Benchmarks-and-Specs.945906.0.html",
      "https://www.notebookcheck.net/AMD-Ryzen-7-255-Processor-Benchmarks-and-Specs.1169506.0.html",
      "https://www.notebookcheck.net/AMD-Ryzen-7-250-Processor-Benchmarks-and-Specs.945901.0.html",
      "https://www.notebookcheck.net/AMD-Ryzen-7-260-Processor-Benchmarks-and-Specs.945912.0.html",
    ],
    confidence: 0.9,
  },
  {
    id: "amd-ryzen200-760m",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [230, 240],
    },
    igpu: { kind: "passmark", name: "Radeon 760M" },
    caveat: "240_assumed_same_as_230=true",
    evidence: [
      "https://www.amd.com/en/products/processors/laptop/ryzen/200-series/amd-ryzen-5-230.html",
      "https://www.notebookcheck.net/AMD-Ryzen-5-230-Processor-Benchmarks-and-Specs.946303.0.html",
    ],
    confidence: 0.85,
  },
  {
    id: "amd-ryzen200-740m",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [210, 215, 220],
    },
    igpu: { kind: "passmark", name: "Radeon 740M" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Ryzen-3-210-Processor-Benchmarks-and-Specs.946313.0.html",
      "https://www.notebookcheck.net/AMD-Ryzen-5-220-Processor-Benchmarks-and-Specs.946309.0.html",
      "https://www.notebookcheck.net/AMD-Ryzen-5-PRO-215-Processor-Benchmarks-and-Specs.1154700.0.html",
    ],
    confidence: 0.88,
  },
  {
    id: "amd-phoenix-hawk-780m",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 7", "Ryzen 9"],
      numberIn: [7840, 7940, 8840, 8845, 8745, 8945],
      suffixIn: ["U", "H", "HS"],
    },
    igpu: { kind: "passmark", name: "Radeon 780M" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Ryzen-7-7840U-Processor-Benchmarks-and-Specs.716412.0.html",
      "https://www.notebookcheck.net/R5-7640U-vs-R7-7840U-vs-R5-7540U_15025_15023_15027.247596.0.html",
      "https://www.notebookcheck.net/AMD-Ryzen-9-270-Processor-Benchmarks-and-Specs.945906.0.html",
    ],
    confidence: 0.93,
  },
  {
    id: "amd-phoenix-hawk-760m",
    match: {
      vendor: "AMD",
      family: "Ryzen 5",
      numberIn: [7640, 8640, 8645],
      suffixIn: ["U", "H", "HS"],
    },
    igpu: { kind: "passmark", name: "Radeon 760M" },
    caveat: "",
    evidence: [
      "https://www.amd.com/en/products/processors/laptop/ryzen/7000-series/amd-ryzen-5-7640u.html",
      "https://www.notebookcheck.net/R5-7640U-vs-R7-7840U-vs-R5-7540U_15025_15023_15027.247596.0.html",
    ],
    confidence: 0.93,
  },
  {
    id: "amd-phoenix2-hawk-740m",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 5", "Ryzen 3"],
      numberIn: [7540, 7545, 7440, 7445, 8540, 8545, 8440, 8445],
      suffixIn: ["U", "H", "HS"],
    },
    igpu: { kind: "passmark", name: "Radeon 740M" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/R5-7640U-vs-R7-7840U-vs-R5-7540U_15025_15023_15027.247596.0.html",
      "https://www.notebookcheck.net/AMD-Ryzen-5-220-Processor-Benchmarks-and-Specs.946309.0.html",
      "https://www.notebookcheck.net/AMD-Ryzen-3-210-Processor-Benchmarks-and-Specs.946313.0.html",
    ],
    confidence: 0.9,
  },
];
