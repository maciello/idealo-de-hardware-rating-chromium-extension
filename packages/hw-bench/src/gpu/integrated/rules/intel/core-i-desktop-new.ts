import type { IgpuRule } from "../../model";

/** Rules for: core-i-desktop-new. */
export const INTEL_CORE_I_DESKTOP_NEW_RULES: readonly IgpuRule[] = [
  {
    id: "intel-core-i-desktop-gen12-14-uhd730",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [12, 13, 14],
      suffixIn: ["", "T", "K"],
      numberIn: [12100, 12300, 12400, 13100, 13400, 14100, 14400],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics 730" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/230495/intel-core-i513400-processor-20m-cache-up-to-4-60-ghz/specifications.html",
    ],
    confidence: 0.85,
  },
  {
    id: "intel-core-i-desktop-gen12-14-uhd770",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [12, 13, 14],
      suffixIn: ["", "T", "K", "KS"],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics 770" },
    caveat: "uhd770_assignment_for_non_F_SKUs_with_number_not_in_730_list_from_memory=true",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/230495/intel-core-i513400-processor-20m-cache-up-to-4-60-ghz/specifications.html",
      "https://www.intel.com/content/www/us/en/products/sku/232166/intel-core-i713700hx-processor-30m-cache-up-to-5-00-ghz/specifications.html",
    ],
    confidence: 0.8,
  },
  {
    id: "intel-core-i-desktop-gen11-uhd730",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [11],
      suffixIn: ["", "T", "K"],
      numberIn: [11400],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics 730" },
    caveat: "",
    evidence: ["https://www.intel.com/content/www/us/en/support/articles/000101986/graphics.html"],
    confidence: 0.6,
  },
  {
    id: "intel-core-i-desktop-gen11-uhd750",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      genIn: [11],
      suffixIn: ["", "T", "K"],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics 750" },
    caveat: "",
    evidence: ["https://www.intel.com/content/www/us/en/support/articles/000101986/graphics.html"],
    confidence: 0.65,
  },
];
