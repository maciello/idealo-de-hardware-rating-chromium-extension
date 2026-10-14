import type { IgpuRule } from "../../model";

/** Rules for: core-i-desktop-old. */
export const INTEL_CORE_I_DESKTOP_OLD_RULES: readonly IgpuRule[] = [
  {
    id: "intel-core-i-desktop-gen10-uhd630",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [10],
      suffixIn: ["", "T", "K"],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics 630" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/i7-1065G7-vs-i7-10750H-vs-i5-1035G1_11399_11708_11411.247596.0.html",
    ],
    confidence: 0.7,
  },
  {
    id: "intel-core-i-desktop-gen8-9-uhd630",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [8, 9],
      suffixIn: ["", "T", "K", "S"],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics 630" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/i5-8250U-vs-i7-7700HQ-vs-i7-7500U_9206_8400_8149.247596.0.html",
    ],
    confidence: 0.8,
  },
  {
    id: "intel-core-i-desktop-gen6-7-hd530-630",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [7],
      suffixIn: ["", "T", "K", "S"],
    },
    igpu: { kind: "passmark", name: "Intel HD 630" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/i5-8250U-vs-i7-7700HQ-vs-i7-7500U_9206_8400_8149.247596.0.html",
    ],
    confidence: 0.8,
  },
  {
    id: "intel-core-i-desktop-gen6-hd530",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [6],
      suffixIn: ["", "T", "K", "S"],
    },
    igpu: { kind: "passmark", name: "Intel HD 530" },
    caveat: "",
    evidence: ["https://www.notebookcheck.net/6700HQ-vs-i5-8250U_6973_9206.247596.0.html"],
    confidence: 0.75,
  },
  {
    id: "intel-core-i-desktop-gen4-hd4600",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [4],
      suffixIn: ["", "T", "K", "S"],
    },
    igpu: { kind: "passmark", name: "Intel HD 4600" },
    caveat: "",
    evidence: ["https://www.notebookcheck.net/Intel-HD-Graphics-4600.86106.0.html"],
    confidence: 0.7,
  },
  {
    id: "intel-core-i7-desktop-gen3-hd4000",
    match: { vendor: "Intel", family: "Core i7", genIn: [3], suffixIn: ["", "T", "K", "S"] },
    igpu: { kind: "passmark", name: "Intel HD 4000" },
    caveat: "",
    evidence: ["https://www.notebookcheck.net/Intel-HD-Graphics-4000.69168.0.html"],
    confidence: 0.75,
  },
  {
    id: "intel-core-i3-i5-desktop-gen3-hd2500",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5"],
      genIn: [3],
      suffixIn: ["", "T", "S"],
    },
    igpu: { kind: "unrated", name: "Intel HD Graphics 2500" },
    caveat: "nearest_passmark_row='Intel HD Family'; hd4000_for_K_SKUs_not_modelled=true",
    evidence: ["https://www.notebookcheck.net/Intel-HD-Graphics-2500.69812.0.html"],
    confidence: 0.7,
  },
  {
    id: "intel-core-i-desktop-gen2-hd2000",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [2],
      suffixIn: ["", "T", "S"],
    },
    igpu: { kind: "passmark", name: "Intel HD 2000" },
    caveat: "low_samples=true; nearest_passmark_row='Intel HD 3000'",
    evidence: [
      "https://www.notebookcheck.net/Intel-HD-Graphics-Sandy-Bridge.56667.0.html",
      "https://www.notebookcheck.net/Intel-HD-Graphics-3000.37948.0.html",
    ],
    confidence: 0.6,
  },
  {
    id: "intel-core-i-gen1-clarkdale",
    match: { vendor: "Intel", familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"], genIn: [1] },
    igpu: { kind: "unrated", name: "Intel HD Graphics (Clarkdale)" },
    caveat: "nearest_passmark_row='Intel HD Family'; vendor_page_not_retrieved=true",
    evidence: ["https://www.notebookcheck.net/Intel-HD-Graphics-Sandy-Bridge.56667.0.html"],
    confidence: 0.4,
  },
];
