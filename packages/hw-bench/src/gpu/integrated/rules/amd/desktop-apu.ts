import type { IgpuRule } from "../../model";

/** Rules for: desktop-apu. */
export const AMD_DESKTOP_APU_RULES: readonly IgpuRule[] = [
  {
    id: "amd-desktop-8000g-780m",
    match: { vendor: "AMD", family: "Ryzen 7", numberIn: [8700], suffixIn: ["G", "GE"] },
    igpu: { kind: "passmark", name: "Radeon 780M" },
    caveat: "",
    evidence: [
      "https://www.amd.com/en/products/processors/desktops/ryzen/8000-series/amd-ryzen-7-8700g.html",
      "https://www.amd.com/en/partner/articles/ryzen-8000G-series-processors.html",
    ],
    confidence: 0.93,
  },
  {
    id: "amd-desktop-8000g-760m",
    match: { vendor: "AMD", family: "Ryzen 5", numberIn: [8600], suffixIn: ["G", "GE"] },
    igpu: { kind: "passmark", name: "Radeon 760M" },
    caveat: "",
    evidence: [
      "https://shop-us-en.amd.com/amd-ryzen-5-8600G-processor/",
      "https://www.amd.com/en/partner/articles/ryzen-8000G-series-processors.html",
    ],
    confidence: 0.9,
  },
  {
    id: "amd-desktop-8000g-740m",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 5", "Ryzen 3"],
      numberIn: [8500, 8300],
      suffixIn: ["G", "GE"],
    },
    igpu: { kind: "passmark", name: "Radeon 740M" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Ryzen-7-8700G-Ryzen-5-8600G-Ryzen-5-8500G-and-Ryzen-3-8300G-APUs-officially-announced-for-budget-gaming-rigs.790194.0.html",
      "https://www.amd.com/en/partner/articles/ryzen-8000G-series-processors.html",
    ],
    confidence: 0.85,
  },
  {
    id: "amd-desktop-apu-vega11",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [2400, 3400],
      suffixIn: ["G", "GE"],
    },
    igpu: { kind: "passmark", name: "Radeon RX Vega 11" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-8-Ryzen-4000-5000-GPU-Benchmarks-and-Specs.453150.0.html",
      "https://www.notebookcheck.net/AMD-Ryzen-7-5700G-Processor-Benchmarks-and-Specs.589479.0.html",
    ],
    confidence: 0.8,
  },
  {
    id: "amd-desktop-apu-vega8-raven-picasso",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [2200, 3200],
      suffixIn: ["G", "GE"],
    },
    igpu: { kind: "passmark", name: "Radeon Vega 8" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-8-Ryzen-4000-5000-GPU-Benchmarks-and-Specs.453150.0.html",
    ],
    confidence: 0.75,
  },
  {
    id: "amd-desktop-apu-vega-renoir-cezanne-8cu",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [4700, 4750, 5700, 5750],
      suffixIn: ["G", "GE"],
    },
    igpu: { kind: "passmark", name: "Radeon Vega 8" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-8-Ryzen-4000-5000-GPU-Benchmarks-and-Specs.453150.0.html",
      "https://www.notebookcheck.net/AMD-Ryzen-7-5700G-Processor-Benchmarks-and-Specs.589479.0.html",
    ],
    confidence: 0.85,
  },
  {
    id: "amd-desktop-apu-vega-renoir-cezanne-7cu",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [4600, 4650, 5500, 5600, 5650],
      suffixIn: ["G", "GE", "GT"],
    },
    igpu: { kind: "passmark", name: "Radeon Vega 8" },
    caveat:
      "proxy_row=true; reason=no PassMark row for Vega 7 (7 CU), nearest is Vega 8 (8 CU); cpu_named_rows_exist='Ryzen N NNNN with Radeon Graphics'",
    evidence: [
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-7-Graphics-Card-Benchmarks-and-Specs.450004.0.html",
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-8-Ryzen-4000-5000-GPU-Benchmarks-and-Specs.453150.0.html",
    ],
    confidence: 0.7,
  },
  {
    id: "amd-desktop-apu-vega-renoir-cezanne-6cu",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberIn: [4300, 4350, 5300, 5350],
      suffixIn: ["G", "GE", "GT"],
    },
    igpu: { kind: "passmark", name: "Radeon Vega 6" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/AMD-Radeon-RX-Vega-6-Ryzen-4000-GPU-Benchmarks-and-Specs.453149.0.html",
    ],
    confidence: 0.7,
  },
];
