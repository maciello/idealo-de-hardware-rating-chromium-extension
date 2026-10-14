import type { IgpuRule } from "../../model";

/** Rules for: xeon-core2. */
export const INTEL_XEON_CORE2_RULES: readonly IgpuRule[] = [
  {
    id: "intel-xeon-e3-1225-v1-hd-p3000",
    match: { labelKeyIn: ["intel-xeon-e3-1225"] },
    igpu: { kind: "passmark", name: "Intel HD P3000" },
    caveat: "label_without_version_assumed_v1=true",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/52270/intel-xeon-processor-e31225-6m-cache-3-10-ghz/specifications.html",
    ],
    confidence: 0.55,
  },
  {
    id: "intel-xeon-e3-1225-v3-hd-p4600",
    match: { labelKeyIn: ["intel-xeon-e3-1225-v3"] },
    igpu: { kind: "passmark", name: "Intel HD P4600/P4700" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/75461/intel-xeon-processor-e31225-v3-8m-cache-3-20-ghz/specifications.html",
    ],
    confidence: 0.7,
  },
  {
    id: "intel-processor-u300-uhd",
    match: { labelKeyIn: ["intel-processor-u300"] },
    igpu: { kind: "passmark", name: "Intel UHD Graphics" },
    caveat: "eu_count_not_verified=true",
    evidence: [
      "https://www.notebookcheck.net/Core-3-N350-vs-U300-vs-N100_18714_14924_14932.247596.0.html",
      "https://www.intel.com/content/www/us/en/ark/products/series/231726/intel-processor.html",
    ],
    confidence: 0.6,
  },
];
