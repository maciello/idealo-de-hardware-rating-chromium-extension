import type { IgpuRule } from "../../model";

/** Rules for: core-ultra-s2. */
export const INTEL_CORE_ULTRA_S2_RULES: readonly IgpuRule[] = [
  {
    id: "intel-ultra-s2-v-arc140v",
    match: {
      vendor: "Intel",
      familyIn: ["Core Ultra 7", "Core Ultra 9"],
      numberRange: [200, 299],
      suffixIn: ["V"],
    },
    igpu: { kind: "passmark", name: "Intel Arc 140V GPU" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/240957/intel-core-ultra-7-processor-258v-12m-cache-up-to-4-80-ghz/specifications.html",
      "https://cdrdv2-public.intel.com/851467/Intel-Core-Ultra-Series1-Series2-Series3-Comparison.pdf",
    ],
    confidence: 0.93,
  },
  {
    id: "intel-ultra-s2-v-arc130v",
    match: { vendor: "Intel", family: "Core Ultra 5", numberRange: [200, 299], suffixIn: ["V"] },
    igpu: { kind: "passmark", name: "Intel Arc 130V GPU" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/240959/intel-core-ultra-5-processor-236v-8m-cache-up-to-4-70-ghz/specifications.html",
      "https://www.notebookcheck.net/Intel-Core-Ultra-5-226V-Processor-Benchmarks-and-Specs.893266.0.html",
    ],
    confidence: 0.9,
  },
  {
    id: "intel-ultra-s2-h-arc140t",
    match: {
      vendor: "Intel",
      familyIn: ["Core Ultra 7", "Core Ultra 9"],
      numberRange: [200, 299],
      suffixIn: ["H"],
    },
    igpu: { kind: "passmark", name: "Intel Arc 140T GPU" },
    caveat:
      "requires_dual_channel_ram=true; requires_min_ram_gb=16; else_reports_as=Intel Graphics",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/241747/intel-core-ultra-9-processor-285h-24m-cache-up-to-5-40-ghz/specifications.html",
      "https://www.notebookcheck.net/Intel-Core-Ultra-7-265H-Processor-Benchmarks-and-Specs.944119.0.html",
      "https://www.notebookcheck.net/Intel-Core-Ultra-7-255H-Processor-Benchmarks-and-Specs.944139.0.html",
      "https://cdrdv2-public.intel.com/851467/Intel-Core-Ultra-Series1-Series2-Series3-Comparison.pdf",
    ],
    confidence: 0.85,
  },
  {
    id: "intel-ultra-s2-h-arc130t",
    match: { vendor: "Intel", family: "Core Ultra 5", numberRange: [200, 299], suffixIn: ["H"] },
    igpu: { kind: "passmark", name: "Intel Arc 130T GPU" },
    caveat:
      "requires_dual_channel_ram=true; requires_min_ram_gb=16; else_reports_as=Intel Graphics",
    evidence: [
      "https://www.notebookcheck.net/Ultra-9-285H-vs-Ultra-5-225H_18542_18910.247596.0.html",
      "https://cdrdv2-public.intel.com/851467/Intel-Core-Ultra-Series1-Series2-Series3-Comparison.pdf",
    ],
    confidence: 0.8,
  },
  {
    id: "intel-ultra-s2-u-intel-graphics",
    match: {
      vendor: "Intel",
      familyIn: ["Core Ultra 5", "Core Ultra 7", "Core Ultra 9"],
      numberRange: [200, 299],
      suffixIn: ["U"],
    },
    igpu: { kind: "passmark", name: "Intel Graphics" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/241861/intel-core-ultra-5-processor-225u-12m-cache-up-to-4-80-ghz/specifications.html",
    ],
    confidence: 0.88,
  },
  {
    id: "intel-ultra-s2-hx-intel-graphics",
    match: {
      vendor: "Intel",
      familyIn: ["Core Ultra 5", "Core Ultra 7", "Core Ultra 9"],
      numberRange: [200, 299],
      suffixIn: ["HX"],
    },
    igpu: { kind: "passmark", name: "Intel Graphics" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/242294/intel-core-ultra-7-processor-265hx-30m-cache-up-to-5-30-ghz/specifications.html",
      "https://www.notebookcheck.net/Intel-Core-Ultra-7-270HX-Plus-Processor-Benchmarks-and-Specs.1252489.0.html",
    ],
    confidence: 0.9,
  },
  {
    id: "intel-ultra-s2-desktop-intel-graphics",
    match: {
      vendor: "Intel",
      familyIn: ["Core Ultra 5", "Core Ultra 7", "Core Ultra 9"],
      numberRange: [200, 299],
      suffixIn: ["", "K", "T", "S"],
    },
    igpu: { kind: "passmark", name: "Intel Graphics" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/241070/intel-core-ultra-5-processor-225-20m-cache-up-to-4-90-ghz/specifications.html",
      "https://www.intel.com/content/www/us/en/products/sku/241674/intel-core-ultra-5-processor-235-24m-cache-up-to-5-00-ghz/specifications.html",
    ],
    confidence: 0.88,
  },
];
