import type { GraphicsMemory } from "@idealo-hw/hw-bench";
import type { GpuMemory } from "./gpu-reading";

const MB_PER_GB = 1024;

/**
 * VRAM of a dedicated card, by source priority: the text's size ("Grafikspeicher 16 GB", or the size written behind the
 * model, "RTX 4060 (8GB)"), then PassMark's size for the matched card as typical. "Shared Memory" on a dedicated card
 * is no VRAM size and is ignored.
 */
export function dedicatedMemory(
  stated: GraphicsMemory | null,
  textGigabytes: number | null,
  passmarkMegabytes: number | null,
): GpuMemory | null {
  const type = stated?.type ?? null;
  const gigabytes = stated?.gigabytes ?? textGigabytes;
  if (gigabytes !== null) return { source: "stated", megabytes: gigabytes * MB_PER_GB, type };
  if (passmarkMegabytes !== null) {
    return { source: "typical", megabytes: passmarkMegabytes, type };
  }
  return null;
}

/**
 * Memory of an iGPU: always shared. A size on the tile ("Grafikspeicher 8 GB") belongs to a dedicated card, even when
 * that card is not one we can name, and idealo writes "Shared Memory" for integrated graphics. PassMark's size is no
 * help either: iGPU rows carry none, or a driver-reported share of system memory (some old Intel HD rows do).
 */
export const integratedMemory = (): GpuMemory => ({
  source: "shared",
  megabytes: null,
  type: null,
});
