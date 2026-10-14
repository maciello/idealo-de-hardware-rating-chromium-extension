import type { IgpuRule } from "../../model";

/** Rules for: desktop-raphael, dragon-range, strix-halo. */
export const AMD_DESKTOP_RAPHAEL_TO_STRIX_HALO_RULES: readonly IgpuRule[] = [
  {
    id: "amd-desktop-7000-9000-radeon-graphics-2cu",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberRange: [7000, 7999],
      suffixIn: ["", "X", "X3D"],
    },
    igpu: { kind: "passmark", name: "Radeon 610M" },
    caveat:
      "proxy_row=true; reason=no PassMark row named 'Radeon Graphics'; same 2 CU RDNA2 config as 610M; cpu_named_rows_exist='Radeon Ryzen N NNNN 6-Core' (per CPU, noisy g3d)",
    evidence: [
      "https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-7-7700.html",
      "https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-9-7950x3d.html",
    ],
    confidence: 0.7,
  },
  {
    id: "amd-desktop-9000-radeon-graphics-2cu",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberRange: [9000, 9999],
      suffixIn: ["", "X", "X3D"],
    },
    igpu: { kind: "passmark", name: "Radeon 610M" },
    caveat:
      "proxy_row=true; reason=no PassMark row named 'Radeon Graphics'; same 2 CU RDNA2 config as 610M; cpu_named_rows_exist='Radeon Ryzen N NNNN 6-Core' (per CPU, noisy g3d)",
    evidence: [
      "https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-5-9600x.html",
      "https://www.notebookcheck.net/AMD-Ryzen-5-9600X-Processor-Benchmarks-and-Specs.862077.0.html",
    ],
    confidence: 0.7,
  },
  {
    id: "amd-mobile-hx-dragon-fire-range-610m",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberRange: [7000, 9999],
      suffixIn: ["HX", "HX3D"],
    },
    igpu: { kind: "passmark", name: "Radeon 610M" },
    caveat: "",
    evidence: [
      "https://www.amd.com/en/products/processors/laptop/ryzen/7000-series/amd-ryzen-9-7945hx.html",
    ],
    confidence: 0.8,
  },
  {
    id: "amd-strix-halo-8060s",
    match: {
      vendor: "AMD",
      family: "Ryzen AI",
      wordsIncludeAny: ["MAX", "MAX+"],
      numberIn: [395, 392, 388],
    },
    igpu: { kind: "passmark", name: "Radeon 8060S" },
    caveat: "max+_388_assignment_from_pre-launch_leak=true",
    evidence: [
      "https://www.guru3d.com/story/amd-ryzen-ai-max-300-series-strix-halo-processors-featuring-radeon-8000s-igpu/",
      "https://www.notebookcheck.com/AMD-Ryzen-Strix-Halo-mit-schneller-Radeon-8060S-zum-guenstigeren-Preis-Leak-enthuellt-Ryzen-AI-Max-388.1155906.0.html",
    ],
    confidence: 0.8,
  },
  {
    id: "amd-strix-halo-8050s",
    match: {
      vendor: "AMD",
      family: "Ryzen AI",
      wordsIncludeAny: ["MAX", "MAX+"],
      numberIn: [390, 385],
    },
    igpu: { kind: "passmark", name: "Radeon 8050S" },
    caveat: "",
    evidence: [
      "https://www.guru3d.com/story/amd-ryzen-ai-max-300-series-strix-halo-processors-featuring-radeon-8000s-igpu/",
      "https://www.notebookcheck.net/AMD-Ryzen-AI-Max-PRO-490-Processor-Benchmarks-and-Specs.1302316.html",
    ],
    confidence: 0.8,
  },
  {
    id: "amd-strix-halo-8040s",
    match: { vendor: "AMD", family: "Ryzen AI", wordsIncludeAny: ["MAX", "MAX+"], numberIn: [380] },
    igpu: { kind: "passmark", name: "Radeon 8040S" },
    caveat: "gpu_name_8040s_not_confirmed_by_vendor_page=true",
    evidence: [
      "https://www.guru3d.com/story/amd-ryzen-ai-max-300-series-strix-halo-processors-featuring-radeon-8000s-igpu/",
    ],
    confidence: 0.6,
  },
];
