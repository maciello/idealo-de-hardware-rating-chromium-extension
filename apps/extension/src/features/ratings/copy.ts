import { MULTI, PAGE_RANK, PER_EURO, SEGMENT, SINGLE } from "./model/cpu/strategy-ids";
import type { GpuKind, GpuMemory } from "./model/gpu";
import { GPU_G3D, GPU_PER_EURO, GPU_PERCENTILE } from "./model/gpu/strategy-ids";

/** Names looked up by an id the engine reports as a plain string; a miss falls back to the id. */
interface LabelTable {
  readonly [id: string]: string;
}

const PRIMARY_LABELS: LabelTable = {
  [MULTI]: "Multi",
  [SINGLE]: "Single",
  [PER_EURO]: "Per €",
  [PAGE_RANK]: "Page rank",
};
const ROW_LABELS: LabelTable = {
  [MULTI]: "Multi-thread",
  [SINGLE]: "Single-thread",
  [PER_EURO]: "Per euro",
  [PAGE_RANK]: "On this page",
  [SEGMENT]: "In its segment",
};
const SEGMENT_NOUNS: LabelTable = {
  laptop: "laptop CPUs",
  desktop: "desktop CPUs",
  server: "server CPUs",
  mobile_embedded: "mobile CPUs",
};
const GPU_ROW_LABELS: LabelTable = {
  [GPU_G3D]: "G3D Mark",
  [GPU_PERCENTILE]: "In its class",
  [GPU_PER_EURO]: "Per euro",
};
const GPU_SEGMENT_NOUNS: LabelTable = { laptop: "laptop GPUs", desktop: "desktop GPUs" };

export const RATINGS_COPY = {
  // Chip, CPU line
  cpuLabel: "CPU",
  cpuUnresolved: "CPU ?",
  ambiguousAria: "CPU: several PassMark matches",
  /** Accessible name of the whole chip button: one sentence per line, then the hint that it opens a card. */
  chipAria: (parts: readonly string[]): string => `${parts.join(". ")}. Show details`,
  cpuAria: (row: string, value: string, tail: readonly string[]): string =>
    `CPU rating ${row} ${value}${tail.map((part) => `, ${part}`).join("")}`,
  /** What the chip says when the item's memory is DDR4 or older; DDR5 and LPDDR5(X) are the baseline. */
  oldMemoryHint: "Older memory generation",
  oldMemoryAria: (label: string, hint: string): string => `${label}: ${hint}`,

  /** The four numbers a user can pick as the chip's headline value. */
  primaryLabels: PRIMARY_LABELS,
  rowLabels: ROW_LABELS,
  segmentNoun: SEGMENT_NOUNS,
  segmentNounFallback: "CPUs",

  // Numbers and meters
  perEuro: (value: string): string => `${value} /€`,
  pageRank: (rank: number, total: number): string => `#${rank} of ${total}`,
  topPercent: (percent: number): string => `top ${percent}%`,
  meterSegment: (percent: number, noun: string): string => `top ${percent}% of ${noun}`,
  meterPage: (percent: number): string => `top ${percent}% on this page`,
  segmentRowContext: (noun: string): string => `of ${noun}`,

  // Card
  ambiguousTitle: "Several PassMark CPUs match",
  ambiguousSub: "The title does not say which one it is.",
  matchedSub: "Matched to PassMark entry",
  importNote: (date: string | null): string =>
    date ? `PassMark import ${date}` : "PassMark import",
  settings: "Settings",

  // GPU
  gpuLabels: { dedicated: "GPU", integrated: "iGPU" } satisfies Readonly<Record<GpuKind, string>>,
  gpuRowLabels: GPU_ROW_LABELS,
  gpuSegmentNoun: GPU_SEGMENT_NOUNS,
  gpuUnratedNote: "PassMark has no rating for this GPU",
  gpuUnrated: (note: string): string => `Unrated: ${note}`,
  gpuUnratedTitle: (name: string, note: string): string => `${name}: ${note}`,
  gpuUnratedAria: (label: string, name: string, memory: string): string =>
    `${label} ${name}, unrated${memory}`,
  gpuRatingAria: (label: string, row: string, value: string, tail: string): string =>
    `${label} rating ${row} ${value}${tail}`,
  gpuMeterAria: (context: string): string => `, ${context}`,
  gpuMemoryAria: (text: string): string => `, graphics memory ${text}`,
  gpuMatchNote: "Matched to PassMark GPU entry",
  gpuAtLeast: "at least",
  gpuLowerBoundNote: (variants: number): string =>
    `Weakest of ${variants} cards the text could mean`,
  igpuNote: "Integrated graphics of the CPU",
  igpuApproximatedNote: "Integrated graphics of the CPU, closest PassMark entry",

  gpuMemoryRow: "gpu_memory",
  gpuMemoryLabel: "Graphics memory",
  memoryShared: "shared",
  memoryTypical: "typical",
  memoryTitles: {
    stated: "As stated in the product's specification",
    typical: "Typical for this card (PassMark); the product does not state it",
    shared: "Uses system memory",
  } satisfies Readonly<Record<GpuMemory["source"], string>>,
} as const;
