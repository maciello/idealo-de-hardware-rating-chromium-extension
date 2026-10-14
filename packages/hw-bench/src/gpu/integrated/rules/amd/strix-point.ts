import type { IgpuRule } from "../../model";

/** Rules for: strix-point. */
export const AMD_STRIX_POINT_RULES: readonly IgpuRule[] = [
  {
    id: "amd-strix-point-ai9-890m",
    match: { vendor: "AMD", family: "Ryzen AI 9", numberIn: [370, 375, 470, 475] },
    igpu: { kind: "passmark", name: "Radeon 890M" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/Ryzen-AI-9-365-vs-Ryzen-AI-9-HX-370_17625_17543.247596.0.html",
      "https://www.amd.com/en/newsroom/press-releases/2024-6-2-amd-unveils-next-gen-zen-5-ryzen-processors-to-p.html",
      "https://www.notebookcheck.net/Ryzen-AI-400-Gorgon-Point-APUs-are-here-AMD-claims-29-faster-multitasking-and-12-faster-gaming-vs-Core-Ultra-9-288V.1197454.0.html",
      "https://www.ultrabookreview.com/74602-amd-gorgon-point-laptops/",
    ],
    confidence: 0.92,
  },
  {
    id: "amd-strix-point-ai9-880m",
    match: { vendor: "AMD", family: "Ryzen AI 9", numberIn: [365, 465] },
    igpu: { kind: "passmark", name: "Radeon 880M" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/Ryzen-AI-9-365-vs-Ryzen-AI-9-HX-370_17625_17543.247596.0.html",
      "https://www.amd.com/en/newsroom/press-releases/2024-6-2-amd-unveils-next-gen-zen-5-ryzen-processors-to-p.html",
      "https://www.ultrabookreview.com/74602-amd-gorgon-point-laptops/",
    ],
    confidence: 0.9,
  },
  {
    id: "amd-strix-point-ai7-pro360-880m",
    match: { vendor: "AMD", family: "Ryzen AI 7", numberIn: [360] },
    igpu: { kind: "passmark", name: "Radeon 880M" },
    caveat: "assignment_from_memory_not_verified_in_session=true",
    evidence: [
      "https://www.notebookcheck.net/Ryzen-AI-9-365-vs-Ryzen-AI-9-HX-370_17625_17543.247596.0.html",
    ],
    confidence: 0.65,
  },
  {
    id: "amd-krackan-ai7-860m",
    match: { vendor: "AMD", family: "Ryzen AI 7", numberIn: [350, 450] },
    igpu: { kind: "passmark", name: "Radeon 860M" },
    caveat: "",
    evidence: [
      "https://www.amd.com/en/products/processors/laptop/ryzen-pro/ai-300-series/amd-ryzen-ai-7-pro-350.html",
      "https://www.notebookcheck.net/Acer-Swift-Air-16-launched-with-AMD-Krackan-Point-APUs-up-to-Ryzen-AI-7-350-with-Radeon-860M-graphics-and-optional-2-8K-OLED-display.1103756.0.html",
      "https://www.ultrabookreview.com/74602-amd-gorgon-point-laptops/",
    ],
    confidence: 0.9,
  },
  {
    id: "amd-krackan-ai7-840m",
    match: { vendor: "AMD", family: "Ryzen AI 7", numberIn: [345, 445] },
    igpu: { kind: "passmark", name: "Radeon 840M" },
    caveat: "445_from_notebookcheck_only=true",
    evidence: [
      "https://www.amd.com/ja/products/processors/laptop/ryzen/ai-300-series/amd-ryzen-ai-7-345.html",
      "https://www.notebookcheck.com/AMD-Ryzen-AI-7-445-Prozessor-Benchmarks-und-Specs.1197763.0.html",
    ],
    confidence: 0.8,
  },
  {
    id: "amd-krackan-ai5-840m",
    match: { vendor: "AMD", family: "Ryzen AI 5", numberIn: [340, 430, 435, 440] },
    igpu: { kind: "passmark", name: "Radeon 840M" },
    caveat: "440_assumed_same_as_435=true",
    evidence: [
      "https://www.notebookcheck.net/AMD-Ryzen-AI-5-340-Processor-Benchmarks-and-Specs.950403.0.html",
      "https://www.notebookcheck.net/Acer-Swift-Air-16-launched-with-AMD-Krackan-Point-APUs-up-to-Ryzen-AI-7-350-with-Radeon-860M-graphics-and-optional-2-8K-OLED-display.1103756.0.html",
      "https://www.notebookcheck.com/AMD-Ryzen-AI-5-435-Prozessor-Benchmarks-und-Specs.1197766.0.html",
    ],
    confidence: 0.85,
  },
  {
    id: "amd-krackan-ai5-820m",
    match: { vendor: "AMD", family: "Ryzen AI 5", numberIn: [330] },
    igpu: { kind: "passmark", name: "Radeon 820M" },
    caveat: "",
    evidence: [
      "https://www.notebookcheck.net/Acer-Swift-Air-16-launched-with-AMD-Krackan-Point-APUs-up-to-Ryzen-AI-7-350-with-Radeon-860M-graphics-and-optional-2-8K-OLED-display.1103756.0.html",
    ],
    confidence: 0.8,
  },
];
