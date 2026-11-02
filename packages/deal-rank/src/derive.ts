import type { Candidate } from "./candidate";

/**
 * Chips whose GPU can use most of the system RAM: Radeon 8040S/8050S/8060S, Ryzen AI Max, Apple M Pro/Max.
 * Matched against the gpu and cpu text.
 */
export const UNIFIED_FAST_MEMORY_PATTERN =
  /radeon\s*80[456]0s\b|ryzen\s*ai\s*max|apple\s*m\d+\s*(?:pro|max)\b/i;

/** Share of RAM an AI runtime can use on unified-fast chips. */
const UNIFIED_MEMORY_SHARE = 0.75;

export type AiMemoryBasis = "dedicated_vram" | "unified_memory_estimate" | "none";

export interface AiMemory {
  gb: number | null;
  basis: AiMemoryBasis;
}

const HEIGHT_TO_MP = 16 / 9 / 1e6;

/** Megapixels as stated, else from the vertical resolution assuming 16:9; null when neither is known. */
export function webcamMegapixels(webcam: Candidate["webcam"]): number | null {
  if (webcam.megapixels !== null) return webcam.megapixels;
  if (webcam.height_px !== null) return webcam.height_px * webcam.height_px * HEIGHT_TO_MP;
  return null;
}

export const hasUnifiedFastMemory = (candidate: Candidate): boolean =>
  UNIFIED_FAST_MEMORY_PATTERN.test(`${candidate.gpu ?? ""} ${candidate.cpu ?? ""}`);

/**
 * Estimated memory available to a local AI model. Dedicated VRAM when there is a dedicated GPU; 75% of RAM
 * on unified-fast chips; otherwise 0. This is an estimate, not a measurement.
 */
export function aiMemory(candidate: Candidate): AiMemory {
  if (candidate.vram_gb !== null && candidate.vram_gb > 0) {
    return { gb: candidate.vram_gb, basis: "dedicated_vram" };
  }
  if (hasUnifiedFastMemory(candidate)) {
    return candidate.ram_gb === null
      ? { gb: null, basis: "unified_memory_estimate" }
      : {
          gb: Math.floor(candidate.ram_gb * UNIFIED_MEMORY_SHARE),
          basis: "unified_memory_estimate",
        };
  }
  return { gb: 0, basis: "none" };
}
