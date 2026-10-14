import type { IgpuRule } from "../../model";

/** Rules for: no-graphics, core-ultra-s1. */
export const INTEL_NO_GRAPHICS_TO_CORE_ULTRA_S1_RULES: readonly IgpuRule[] = [
  {
    id: "intel-core-i-f-kf-none",
    match: {
      vendor: "Intel",
      familyIn: ["Core i3", "Core i5", "Core i7", "Core i9"],
      suffixIn: ["F", "KF"],
    },
    igpu: { kind: "none" },
    caveat: "f_suffix_has_no_igpu=true",
    evidence: [
      "https://www.notebookcheck.net/Intel-Core-i5-13400F-Processor-Benchmarks-and-Specs.691589.0.html",
      "https://community.intel.com/t5/Mobile-and-Desktop-Processors/Can-i-boot-pc-i5-13400F-without-GPU/td-p/1519192",
    ],
    confidence: 0.97,
  },
  {
    id: "intel-core-ultra-f-kf-none",
    match: {
      vendor: "Intel",
      familyIn: ["Core Ultra 5", "Core Ultra 7", "Core Ultra 9"],
      suffixIn: ["F", "KF"],
    },
    igpu: { kind: "none" },
    caveat: "",
    evidence: [
      "https://www.intel.com/content/www/us/en/ark/products/series/241071/intel-core-ultra-processors-series-2.html",
      "https://www.intel.com/content/www/us/en/products/sku/241070/intel-core-ultra-5-processor-225-20m-cache-up-to-4-90-ghz/specifications.html",
    ],
    confidence: 0.9,
  },
  {
    id: "intel-core-numbered-f-none",
    match: { vendor: "Intel", familyIn: ["Core 3", "Core 5", "Core 7", "Core 9"], suffixIn: ["F"] },
    igpu: { kind: "none" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/Intel-Core-i5-13400F-Processor-Benchmarks-and-Specs.691589.0.html",
    ],
    confidence: 0.8,
  },
  {
    id: "intel-xeon-haswell-ep-none",
    match: { labelKeyIn: ["intel-xeon-e5-2666-v3", "intel-xeon-e5-2678-v3"] },
    igpu: { kind: "none" },
    caveat: "server_part_no_igpu=true; evidence_is_third_party_not_ark=true",
    evidence: [
      "https://www.gekko-computer.de/en/p/Intel-CPU-Socket-2011-3-12-Core-Xeon-E5-2678-v3-2-5GHz-30M-5GT-s-SR20Z",
      "https://hw-museum.cz/cpu/457/intel-xeon-e5-2666-v3",
    ],
    confidence: 0.85,
  },
  {
    id: "intel-xeon-w-2125-none",
    match: { labelKeyIn: ["intel-xeon-w-2125"] },
    igpu: { kind: "none" },
    caveat: "server_part_no_igpu=true; evidence_is_third_party_not_ark=true",
    evidence: [
      "https://techpowerup.com/cpu-specs/xeon-w-2125.c2949",
      "https://askgeek.io/en/cpus/Intel/Xeon-W-2125",
    ],
    confidence: 0.85,
  },
  {
    id: "intel-core2-duo-none",
    match: { labelKeyIn: ["intel-core-2-duo"] },
    igpu: { kind: "none" },
    caveat: "pre_nehalem_no_igpu=true; evidence_is_third_party_not_ark=true",
    evidence: ["https://www.techspot.com/specs/cpu/80203-intel-core-2-duo-e8400.html"],
    confidence: 0.9,
  },
  {
    id: "intel-ultra-s1-h-arc",
    match: {
      vendor: "Intel",
      familyIn: ["Core Ultra 5", "Core Ultra 7", "Core Ultra 9"],
      numberRange: [100, 199],
      suffixIn: ["H"],
    },
    igpu: { kind: "passmark", name: "Intel Arc" },
    caveat:
      "requires_dual_channel_ram=true; requires_min_ram_gb=16; else_reports_as=Intel Graphics",
    evidence: [
      "https://www.intel.com/content/www/us/en/products/sku/236847/intel-core-ultra-7-processor-155h-24m-cache-up-to-4-80-ghz/specifications.html",
      "https://www.intel.com/content/www/us/en/ark/products/series/236803/intel-core-ultra-processors-series-1.html",
      "https://sg.news.yahoo.com/intels-slapped-16gb-dual-channel-152104996.html",
    ],
    confidence: 0.9,
  },
  {
    id: "intel-ultra-s1-u-intel-graphics",
    match: {
      vendor: "Intel",
      familyIn: ["Core Ultra 5", "Core Ultra 7", "Core Ultra 9"],
      numberRange: [100, 199],
      suffixIn: ["U"],
    },
    igpu: { kind: "passmark", name: "Intel Graphics" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/Intel-Core-Ultra-5-125U-Processor-Benchmarks-and-Specs.783351.0.html",
      "https://www.intel.com/content/www/us/en/ark/products/series/236803/intel-core-ultra-processors-series-1.html",
    ],
    confidence: 0.88,
  },
];
