import type { IgpuRule } from "../../model";

/** Rules for: n-series. */
export const INTEL_N_SERIES_RULES: readonly IgpuRule[] = [
  {
    id: "intel-n-series-uhd",
    match: {
      vendor: "Intel",
      family: "",
      prefix: "N",
      numberIn: [50, 95, 97, 100, 150, 200, 250, 300, 305, 350, 355],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics" },
    caveat: "ark_names_n150_n250_as_Intel Graphics=true",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/231803/intel-processor-n100-6m-cache-up-to-3-40-ghz/specifications.html",
      "https://www.notebookcheck.net/Intel-Processor-N150-Processor-Benchmarks-and-Specs.951351.0.html",
      "https://www.notebookcheck.net/Intel-Processor-N250-Processor-Benchmarks-and-Specs.951348.0.html",
      "https://www.notebookcheck.net/Intel-Processor-N200-CPU-Benchmarks-and-Specs.678940.0.html",
    ],
    confidence: 0.8,
  },
  {
    id: "intel-celeron-n3350-hd500",
    match: { vendor: "Intel", family: "Celeron", prefix: "N", numberIn: [3350] },
    igpu: { kind: "passmark", name: "Intel HD 500" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/www/us/en/ark/products/series/87282/intel-celeron-processor-n-series.html",
    ],
    confidence: 0.6,
  },
  {
    id: "intel-celeron-gemini-lake-uhd600",
    match: { vendor: "Intel", family: "Celeron", prefix: "N", numberIn: [4000, 4020, 4100, 4120] },
    igpu: { kind: "passmark", name: "Intel UHD Graphics 600" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/197310/intel-celeron-processor-n4020-4m-cache-up-to-2-80-ghz/specifications.html",
      "https://www.notebookcheck.net/Celeron-N5100-vs-Celeron-N4120-vs-Celeron-N4020_13077_11533_11535.247596.0.html",
    ],
    confidence: 0.85,
  },
  {
    id: "intel-pentium-n5030-uhd605",
    match: {
      vendor: "Intel",
      familyIn: ["Pentium", "Pentium Silver"],
      prefix: "N",
      numberIn: [5000, 5030],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics 605" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/www/us/en/ark/products/series/87282/intel-celeron-processor-n-series.html",
    ],
    confidence: 0.6,
  },
  {
    id: "intel-celeron-pentium-jasper-elkhart-uhd",
    match: {
      vendor: "Intel",
      familyIn: ["Celeron", "Pentium", "Pentium Silver"],
      prefixIn: ["N", "J"],
      numberIn: [4500, 5100, 6000, 6005, 6412],
    },
    igpu: { kind: "passmark", name: "Intel UHD Graphics" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/Celeron-N4020-vs-Pentium-N6000_11535_13075.247596.0.html",
      "https://www.notebookcheck.net/Celeron-N5100-vs-Celeron-N4120-vs-Celeron-N4020_13077_11533_11535.247596.0.html",
    ],
    confidence: 0.7,
  },
  {
    id: "intel-pentium-gold-8505-uhd",
    match: { vendor: "Intel", familyIn: ["Pentium", "Pentium Gold"], prefix: "", numberIn: [8505] },
    igpu: { kind: "passmark", name: "Intel UHD Graphics" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/dam/www/central-libraries/us/en/documents/2022-12/iot-13th-gen-core-mobile-product-brief.pdf",
    ],
    confidence: 0.6,
  },
  {
    id: "intel-pentium-g4400-hd510",
    match: { vendor: "Intel", family: "Pentium", prefix: "G", numberIn: [4400, 4500, 4560] },
    igpu: { kind: "passmark", name: "Intel HD 510" },
    caveat: "",
    evidence: ["https://www.notebookcheck.net/6700HQ-vs-i5-8250U_6973_9206.247596.0.html"],
    confidence: 0.6,
  },
  {
    id: "intel-pentium-g3220-haswell",
    match: { vendor: "Intel", family: "Pentium", prefix: "G", numberIn: [3220, 3240, 3250, 3258] },
    igpu: { kind: "unrated", name: "Intel HD Graphics (Haswell GT1)" },
    caveat: "nearest_passmark_row='Intel HD Family'",
    evidence: ["https://www.notebookcheck.net/Intel-HD-Graphics-Haswell.93341.0.html"],
    confidence: 0.5,
  },
];
