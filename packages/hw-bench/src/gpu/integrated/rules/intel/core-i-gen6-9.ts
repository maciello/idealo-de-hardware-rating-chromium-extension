import type { IgpuRule } from "../../model";

/** Rules for: core-i-gen6-9. */
export const INTEL_CORE_I_GEN6_9_RULES: readonly IgpuRule[] = [
  {
    id: "intel-core-i-gen8-coffee-whiskey-u-iris-plus-645",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [8],
      suffixIn: ["U"],
      numberIn: [8257, 8259],
    },
    igpu: { kind: "passmark", name: "Intel Iris Plus 645" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/i5-8250U-vs-i7-7700HQ-vs-i7-7500U_9206_8400_8149.247596.0.html",
    ],
    confidence: 0.65,
  },
  {
    id: "intel-core-i-gen8-u-uhd620",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [8],
      suffixIn: ["U", "Y"],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics 620" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/i5-8250U-vs-i7-7700HQ-vs-i7-7500U_9206_8400_8149.247596.0.html",
    ],
    confidence: 0.85,
  },
  {
    id: "intel-core-i-gen8-9-h-uhd630",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [8, 9],
      suffixIn: ["H", "HK", "HQ"],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics 630" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/i5-8250U-vs-i7-7700HQ-vs-i7-7500U_9206_8400_8149.247596.0.html",
    ],
    confidence: 0.8,
  },
  {
    id: "intel-core-i-gen7-u-iris-plus-640",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [7],
      suffixIn: ["U"],
      numberIn: [7360, 7260, 7560, 7660, 7267, 7567],
    },
    igpu: { kind: "passmark", name: "Intel Iris Plus 640" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/i5-8250U-vs-i7-7700HQ-vs-i7-7500U_9206_8400_8149.247596.0.html",
    ],
    confidence: 0.65,
  },
  {
    id: "intel-core-i-gen7-u-hd620",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [7],
      suffixIn: ["U", "Y"],
    },
    igpu: { kind: "passmark", name: "Intel HD Graphics 620" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/i5-8250U-vs-i7-7700HQ-vs-i7-7500U_9206_8400_8149.247596.0.html",
    ],
    confidence: 0.85,
  },
  {
    id: "intel-core-i-gen7-hq-hd630",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [7],
      suffixIn: ["H", "HQ", "HK"],
    },
    igpu: { kind: "passmark", name: "Intel HD 630" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/i5-8250U-vs-i7-7700HQ-vs-i7-7500U_9206_8400_8149.247596.0.html",
    ],
    confidence: 0.8,
  },
  {
    id: "intel-core-i-gen6-u-hd520",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [6],
      suffixIn: ["U", "Y"],
    },
    igpu: { kind: "passmark", name: "Intel HD 520" },
    caveat: "",
    evidence: ["https://www.notebookcheck.net/6700HQ-vs-i5-8250U_6973_9206.247596.0.html"],
    confidence: 0.8,
  },
  {
    id: "intel-core-i-gen6-hq-hd530",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [6],
      suffixIn: ["H", "HQ", "HK"],
    },
    igpu: { kind: "passmark", name: "Intel HD 530" },
    caveat: "",
    evidence: ["https://www.notebookcheck.net/6700HQ-vs-i5-8250U_6973_9206.247596.0.html"],
    confidence: 0.8,
  },
];
