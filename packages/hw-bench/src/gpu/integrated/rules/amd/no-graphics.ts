import type { IgpuRule } from "../../model";

/** Rules for: no-graphics. */
export const AMD_NO_GRAPHICS_RULES: readonly IgpuRule[] = [
  {
    id: "amd-threadripper-none",
    match: { vendor: "AMD", family: "Ryzen Threadripper" },
    igpu: { kind: "none" },
    caveat: "",
    evidence: [
      "https://www.amd.com/en/products/processors/ryzen-threadripper/9000-series/amd-ryzen-threadripper-9960x.html",
      "https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen-threadripper/ryzen-threadripper-3000-series/amd-ryzen-threadripper-3990x.html",
    ],
    confidence: 0.97,
  },
  {
    id: "amd-ryzen-desktop-1000-5000-non-g-none",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberRange: [1000, 5999],
      suffixIn: ["", "X", "XT", "X3D"],
    },
    igpu: { kind: "none" },
    caveat:
      "applies_to=desktop Ryzen 1000-5000 without G/GE/GT suffix (incl. PRO); mobile U/H/HS/HX and APU G-series have iGPU",
    evidence: [
      "https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-5000-series/amd-ryzen-7-5700.html",
      "https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-3000-series/amd-ryzen-7-3700x.html",
      "https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-5000-series/amd-ryzen-7-5700x3d.html",
    ],
    confidence: 0.95,
  },
  {
    id: "amd-ryzen-desktop-f-none",
    match: {
      vendor: "AMD",
      familyIn: ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
      numberRange: [7000, 9999],
      suffixIn: ["F"],
    },
    igpu: { kind: "none" },
    caveat: "evidence_does_not_cover_7000_F_suffix_directly=true",
    evidence: [
      "https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-5000-series/amd-ryzen-7-5700.html",
    ],
    confidence: 0.6,
  },
];
