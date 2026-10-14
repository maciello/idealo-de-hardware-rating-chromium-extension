import type { IgpuRule } from "../../model";

/** Rules for: zen3-renoir. */
export const AMD_ZEN3_RENOIR_RULES: readonly IgpuRule[] = [
  {
    id: "amd-zen3-mobile-vega8",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [5700, 5800, 5825, 5850, 5875, 5900, 5980],
      suffixIn: ["U", "H", "HS", "HX"],
    },
    igpu: { kind: "passmark", name: "Radeon Vega 8" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-8-Ryzen-4000-5000-GPU-Benchmarks-and-Specs.453150.0.html",
      "https://www.notebookcheck.net/AMD-Cezanne-benchmarks-Ryzen-5000H-45-watt-APUs-with-Zen-3.516895.0.html",
    ],
    confidence: 0.85,
  },
  {
    id: "amd-zen3-mobile-vega7",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [5500, 5560, 5600, 5625, 5650, 5675],
      suffixIn: ["U", "H", "HS", "HX"],
    },
    igpu: { kind: "passmark", name: "Radeon Vega 8" },
    caveat:
      "proxy_row=true; reason=no PassMark row for Vega 7 (7 CU), nearest is Vega 8 (8 CU); cpu_named_rows_exist='Ryzen N NNNN with Radeon Graphics'",
    evidence: [
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-7-Graphics-Card-Benchmarks-and-Specs.450004.0.html",
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-8-Ryzen-4000-5000-GPU-Benchmarks-and-Specs.453150.0.html",
      "https://www.notebookcheck.net/AMD-Cezanne-benchmarks-Ryzen-5000H-45-watt-APUs-with-Zen-3.516895.0.html",
    ],
    confidence: 0.7,
  },
  {
    id: "amd-zen3-mobile-vega6",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [5300, 5400, 5425],
      suffixIn: ["U", "H", "HS", "HX"],
    },
    igpu: { kind: "passmark", name: "Radeon Vega 6" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-6-Ryzen-4000-GPU-Benchmarks-and-Specs.453149.0.html",
      "https://www.notebookcheck.net/AMD-Cezanne-benchmarks-Ryzen-5000H-45-watt-APUs-with-Zen-3.516895.0.html",
    ],
    confidence: 0.8,
  },
  {
    id: "amd-renoir-vega8",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [4800, 4980],
      suffixIn: ["U"],
    },
    igpu: { kind: "passmark", name: "Radeon Vega 8" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-8-Ryzen-4000-5000-GPU-Benchmarks-and-Specs.453150.0.html",
      "https://www.notebookcheck.net/Updated-AMD-Ryzen-Mobile-4000-U-and-H-series-APUs-bring-7nm-8C-16T-goodness-to-laptops-first-benchmarks-show-AMD-clobbering-Intel-Core-i7-1065G7-and-Core-i7-9750H-for-big-gains.449329.0.html",
    ],
    confidence: 0.8,
  },
  {
    id: "amd-renoir-vega8-h",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [4900],
      suffixIn: ["H", "HS"],
    },
    igpu: { kind: "passmark", name: "Radeon Vega 8" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-8-Ryzen-4000-5000-GPU-Benchmarks-and-Specs.453150.0.html",
      "https://www.notebookcheck.net/Updated-AMD-Ryzen-Mobile-4000-U-and-H-series-APUs-bring-7nm-8C-16T-goodness-to-laptops-first-benchmarks-show-AMD-clobbering-Intel-Core-i7-1065G7-and-Core-i7-9750H-for-big-gains.449329.0.html",
    ],
    confidence: 0.75,
  },
  {
    id: "amd-renoir-vega7",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [4700, 4750, 4800],
      suffixIn: ["U", "H", "HS"],
    },
    igpu: { kind: "passmark", name: "Radeon Vega 8" },
    caveat:
      "proxy_row=true; reason=no PassMark row for Vega 7 (7 CU), nearest is Vega 8 (8 CU); cpu_named_rows_exist='Ryzen N NNNN with Radeon Graphics'",
    evidence: [
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-7-Graphics-Card-Benchmarks-and-Specs.450004.0.html",
      "https://www.notebookcheck.net/Updated-AMD-Ryzen-Mobile-4000-U-and-H-series-APUs-bring-7nm-8C-16T-goodness-to-laptops-first-benchmarks-show-AMD-clobbering-Intel-Core-i7-1065G7-and-Core-i7-9750H-for-big-gains.449329.0.html",
    ],
    confidence: 0.65,
  },
  {
    id: "amd-renoir-vega6",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [4300, 4450, 4500, 4600, 4650],
      suffixIn: ["U", "H", "HS"],
    },
    igpu: { kind: "passmark", name: "Radeon Vega 6" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-6-Ryzen-4000-GPU-Benchmarks-and-Specs.453149.0.html",
      "https://www.notebookcheck.net/Updated-AMD-Ryzen-Mobile-4000-U-and-H-series-APUs-bring-7nm-8C-16T-goodness-to-laptops-first-benchmarks-show-AMD-clobbering-Intel-Core-i7-1065G7-and-Core-i7-9750H-for-big-gains.449329.0.html",
    ],
    confidence: 0.75,
  },
];
