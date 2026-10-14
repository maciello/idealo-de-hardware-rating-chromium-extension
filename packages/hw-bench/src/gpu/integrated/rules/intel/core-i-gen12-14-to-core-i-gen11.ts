import type { IgpuRule } from "../../model";

/** Rules for: core-i-gen12-14, core-i-gen11. */
export const INTEL_CORE_I_GEN12_14_TO_CORE_I_GEN11_RULES: readonly IgpuRule[] = [
  {
    id: "intel-core-i-hx-gen12-14-uhd",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [12, 13, 14],
      suffixIn: ["HX"],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/232166/intel-core-i713700hx-processor-30m-cache-up-to-5-00-ghz/specifications.html",
      "https://www.intel.com/content/www/us/en/products/sku/232149/intel-core-i913950hx-processor-36m-cache-up-to-5-50-ghz/specifications.html",
    ],
    confidence: 0.85,
  },
  {
    id: "intel-core-i-h-gen12-13-uhd-lowend",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [12, 13],
      suffixIn: ["H"],
      numberIn: [12450, 12650, 13420, 13620],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics" },
    caveat: "i5-13420H_48EU_per_ark=true",
    evidence: [
      "https://community.intel.com/t5/Graphics/What-version-of-Iris-xe-graphics-in-i5-13420H-after-dual-channel/m-p/1638588",
      "https://www.notebookcheck.net/i3-1215U-vs-i5-1240P-vs-i5-1235U_14098_14068_14078.247596.0.html",
    ],
    confidence: 0.65,
  },
  {
    id: "intel-core-i-h-gen12-13-iris-xe",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [12, 13],
      suffixIn: ["H"],
    },
    igpu: { kind: "passmark", name: "Intel Iris Xe" },
    caveat: "requires_dual_channel_ram=true; else_reports_as=Intel UHD Graphics",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/132228/intel-core-i712700h-processor-24m-cache-up-to-4-70-ghz/specifications.html",
      "https://www.intel.com/content/dam/www/central-libraries/us/en/documents/2022-12/iot-13th-gen-core-mobile-product-brief.pdf",
      "https://www.intel.com/content/www/us/en/support/articles/000094617/graphics.html",
    ],
    confidence: 0.85,
  },
  {
    id: "intel-core-i3-u-p-gen12-13-uhd",
    match: { vendor: "Intel", family: "Core i3", genIn: [12, 13], suffixIn: ["U", "P"] },
    igpu: { kind: "passmark", name: "Intel UHD Graphics" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/i3-1215U-vs-i5-1240P-vs-i5-1235U_14098_14068_14078.247596.0.html",
      "https://www.intel.com/content/www/us/en/ark/products/series/230488/13th-generation-intel-core-i3-processors.html",
    ],
    confidence: 0.8,
  },
  {
    id: "intel-core-i5-i7-i9-u-p-gen12-13-iris-xe",
    match: {
      vendor: "Intel",
      familyIn: ["Core i5", "Core i7", "Core i9"],
      genIn: [12, 13],
      suffixIn: ["U", "P"],
    },
    igpu: { kind: "passmark", name: "Intel Iris Xe" },
    caveat: "requires_dual_channel_ram=true; else_reports_as=Intel UHD Graphics",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/132221/intel-core-i51240p-processor-12m-cache-up-to-4-40-ghz/specifications.html",
      "https://www.notebookcheck.net/Intel-Core-i5-1235U-Processor-Benchmarks-and-Specs.589637.0.html",
      "https://www.intel.com/content/www/us/en/products/sku/232143/intel-core-i51334u-processor-12m-cache-up-to-4-60-ghz/specifications.html",
      "https://www.intel.com/content/www/us/en/support/articles/000094617/graphics.html",
      "https://www.intel.com/content/dam/www/central-libraries/us/en/documents/2022-12/iot-13th-gen-core-mobile-product-brief.pdf",
    ],
    confidence: 0.9,
  },
  {
    id: "intel-core-i-gen11-g7-iris-xe",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [11],
      suffixIn: ["G7"],
    },
    igpu: { kind: "passmark", name: "Intel Iris Xe" },
    caveat: "requires_dual_channel_ram=true; else_reports_as=Intel UHD Graphics",
    evidence: [
      "https://www.intel.com/content/www/us/en/docs/oneapi/optimization-guide-gpu/2023-0/intel-iris-xe-gpu-architecture.html",
      "https://www.intel.com/content/www/us/en/support/articles/000094617/graphics.html",
      "https://www.intel.com/content/www/us/en/support/articles/000059744/graphics.html",
    ],
    confidence: 0.9,
  },
  {
    id: "intel-core-i-gen11-g4-g1-uhd",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [11],
      suffixIn: ["G4", "G1"],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/www/us/en/docs/oneapi/optimization-guide-gpu/2023-0/intel-iris-xe-gpu-architecture.html",
    ],
    confidence: 0.65,
  },
  {
    id: "intel-core-i-gen11-h-uhd",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [11],
      suffixIn: ["H", "HK"],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/www/us/en/docs/oneapi/optimization-guide-gpu/2023-0/intel-iris-xe-gpu-architecture.html",
    ],
    confidence: 0.6,
  },
];
