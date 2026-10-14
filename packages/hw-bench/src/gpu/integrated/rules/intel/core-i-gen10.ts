import type { IgpuRule } from "../../model";

/** Rules for: core-i-gen10. */
export const INTEL_CORE_I_GEN10_RULES: readonly IgpuRule[] = [
  {
    id: "intel-core-i-gen10-icelake-g7-g4-iris-plus",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [10],
      suffixIn: ["G7", "G4"],
    },
    igpu: { kind: "passmark", name: "Intel Iris Plus" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/196597/intel-core-i71065g7-processor-8m-cache-up-to-3-90-ghz/specifications.html",
      "https://www.notebookcheck.net/i7-1065G7-vs-i7-10750H-vs-i5-1035G1_11399_11708_11411.247596.0.html",
    ],
    confidence: 0.85,
  },
  {
    id: "intel-core-i-gen10-icelake-g1-uhd",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [10],
      suffixIn: ["G1"],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics" },
    caveat: "",
    evidence: ["https://www.notebookcheck.net/1065G7-vs-1035G1_11399_11411.247596.0.html"],
    confidence: 0.8,
  },
  {
    id: "intel-core-i-gen10-comet-lake-h-uhd630",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [10],
      suffixIn: ["H", "HK"],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics 630" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/i7-1065G7-vs-i7-10750H-vs-i5-1035G1_11399_11708_11411.247596.0.html",
    ],
    confidence: 0.7,
  },
  {
    id: "intel-core-i-gen10-comet-lake-u-uhd",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [10],
      suffixIn: ["U"],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics" },
    caveat: "notebookcheck_calls_it_HD_620_ark_says_UHD=true",
    evidence: [
      "https://www.notebookcheck.net/i7-1065G7-vs-i7-10750H-vs-i5-1035G1_11399_11708_11411.247596.0.html",
    ],
    confidence: 0.6,
  },
];
