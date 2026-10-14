import type { IgpuRule } from "../../model";

/** Rules for: core-ultra-s3, core-numbered. */
export const INTEL_CORE_ULTRA_S3_TO_CORE_NUMBERED_RULES: readonly IgpuRule[] = [
  {
    id: "intel-ultra-s3-h-x-b390",
    match: {
      vendor: "Intel",
      familyIn: ["Core Ultra X7", "Core Ultra X9"],
      numberRange: [300, 399],
      suffixIn: ["H"],
    },
    igpu: { kind: "passmark", name: "Intel Arc B390 GPU" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/www/us/en/ark/products/series/245528/intel-core-ultra-series-3-processors.html",
      "https://cdrdv2-public.intel.com/871380/Intel%20Core%20Ultra%20Series%203%20Processors%20-%20Quick%20Reference%20Guide%20v1.pdf",
    ],
    confidence: 0.7,
  },
  {
    id: "intel-ultra-s3-h-b370",
    match: { vendor: "Intel", family: "Core Ultra 5", numberRange: [300, 399], suffixIn: ["H"] },
    igpu: { kind: "passmark", name: "Intel Arc B370 GPU" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/www/us/en/ark/products/series/245528/intel-core-ultra-series-3-processors.html",
      "https://cdrdv2-public.intel.com/871380/Intel%20Core%20Ultra%20Series%203%20Processors%20-%20Quick%20Reference%20Guide%20v1.pdf",
    ],
    confidence: 0.65,
  },
  {
    id: "intel-ultra-s3-nonh-intel-graphics",
    match: {
      vendor: "Intel",
      familyIn: ["Core Ultra 5", "Core Ultra 7", "Core Ultra 9"],
      numberRange: [300, 399],
      suffixIn: [""],
    },
    igpu: { kind: "passmark", name: "Intel Graphics" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/Intel-Core-Ultra-5-322-Processor-Benchmarks-and-Specs.1196964.0.html",
      "https://www.notebookcheck.net/Intel-Core-Ultra-5-335-Processor-Benchmarks-and-Specs.1196771.0.html",
      "https://www.notebookcheck.net/Intel-Core-Ultra-7-365-Processor-Benchmarks-and-Specs.1196952.0.html",
    ],
    confidence: 0.75,
  },
  {
    id: "intel-core-s1-u-uhd",
    match: { vendor: "Intel", family: "Core 3", numberRange: [100, 199], suffixIn: ["U"] },
    igpu: { kind: "passmark", name: "Intel UHD Graphics" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/Core-7-150U-vs-Core-5-120U-vs-Core-3-100U_17176_17178_17180.247596.0.html",
    ],
    confidence: 0.75,
  },
  {
    id: "intel-core-s1s2-u-iris-xe",
    match: {
      vendor: "Intel",
      familyIn: ["Core 5", "Core 7"],
      numberRange: [100, 259],
      suffixIn: ["U"],
    },
    igpu: { kind: "passmark", name: "Intel Iris Xe" },
    caveat: "requires_dual_channel_ram=true; else_reports_as=Intel UHD Graphics",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/236795/intel-core-7-processor-150u-12m-cache-up-to-5-40-ghz/specifications.html",
      "https://www.notebookcheck.net/Intel-Core-5-120U-Processor-Benchmarks-and-Specs.791267.0.html",
      "https://www.notebookcheck.net/Intel-Core-7-250U-Processor-Benchmarks-and-Specs.1133295.0.html",
      "https://www.intel.com/content/www/us/en/support/articles/000094617/graphics.html",
    ],
    confidence: 0.85,
  },
  {
    id: "intel-core-wildcat-lake-intel-graphics",
    match: {
      vendor: "Intel",
      familyIn: ["Core 3", "Core 5", "Core 7"],
      prefix: "",
      numberRange: [300, 399],
      suffixIn: [""],
    },
    igpu: { kind: "passmark", name: "Intel Graphics" },
    caveat: "core3_304_not_verified=true",
    evidence: [
      "https://www.notebookcheck.net/Intel-Graphics-2-Core-Xe3-Wildcat-Lake-iGPU-Benchmarks-and-Specs.1302173.0.html",
      "https://www.notebookcheck.net/Intel-Core-7-350-Processor-Benchmarks-and-Specs.1276864.0.html",
    ],
    confidence: 0.65,
  },
  {
    id: "intel-core-n-twin-lake-uhd",
    match: { vendor: "Intel", familyIn: ["Core 3", "Core"], prefix: "N" },
    igpu: { kind: "passmark", name: "Intel UHD Graphics" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/Core-3-N350-vs-U300-vs-N100_18714_14924_14932.247596.0.html",
      "https://www.intel.com/content/www/us/en/ark/products/series/231726/intel-processor.html",
    ],
    confidence: 0.65,
  },
];
