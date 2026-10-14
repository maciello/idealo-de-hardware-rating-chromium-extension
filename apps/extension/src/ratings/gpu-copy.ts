import { formatMemorySize } from "../ui/format";
import type { GpuKind, GpuMemory } from "./gpu-reading";

/** Chip labels: "iGPU" is only ever the graphics inside the CPU. */
export const GPU_LABELS: Readonly<Record<GpuKind, string>> = {
  dedicated: "GPU",
  integrated: "iGPU",
};

export const GPU_UNRATED_NOTE = "PassMark has no rating for this GPU";
export const IGPU_NOTE = "Integrated graphics of the CPU";
export const IGPU_APPROXIMATED_NOTE = "Integrated graphics of the CPU, closest PassMark entry";

export const GPU_MEMORY_ROW = "gpu_memory";
export const GPU_MEMORY_LABEL = "Graphics memory";
const MEMORY_SHARED = "shared";
const MEMORY_TYPICAL = "typical";

const MEMORY_TITLES: Readonly<Record<GpuMemory["source"], string>> = {
  stated: "As stated in the product's specification",
  typical: "Typical for this card (PassMark); the product does not state it",
  shared: "Uses system memory",
};

export interface MemoryText {
  /** "16 GB", "16 GB GDDR7", "8 GB typical", "shared". */
  text: string;
  /** Where the figure comes from. */
  title: string;
}

/** The memory as one short phrase for the chip and the card row. */
export function memoryText(memory: GpuMemory): MemoryText {
  const title = MEMORY_TITLES[memory.source];
  if (memory.megabytes === null) return { text: MEMORY_SHARED, title };
  const parts = [formatMemorySize(memory.megabytes), memory.type];
  if (memory.source === "typical") parts.push(MEMORY_TYPICAL);
  return { text: parts.filter((part) => part !== null).join(" "), title };
}
