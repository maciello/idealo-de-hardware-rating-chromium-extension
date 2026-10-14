import { formatMemorySize } from "../../../../ui/format";
import { RATINGS_COPY } from "../../copy";
import type { GpuMemory } from "../../model";

export interface MemoryText {
  /** "16 GB", "16 GB GDDR7", "8 GB typical", "shared". */
  text: string;
  /** Where the figure comes from. */
  title: string;
}

/** The memory as one short phrase for the chip and the card row. */
export function memoryText(memory: GpuMemory): MemoryText {
  const title = RATINGS_COPY.memoryTitles[memory.source];
  if (memory.megabytes === null) return { text: RATINGS_COPY.memoryShared, title };
  const parts = [formatMemorySize(memory.megabytes), memory.type];
  if (memory.source === "typical") parts.push(RATINGS_COPY.memoryTypical);
  return { text: parts.filter((part) => part !== null).join(" "), title };
}
