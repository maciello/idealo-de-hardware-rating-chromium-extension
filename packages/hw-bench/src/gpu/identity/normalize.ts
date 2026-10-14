import { cleanText, slugify } from "../../identity";

/** Fallback key for names no extractor knows (Quadro, workstation cards): vendor words and marks removed. */
export function normalizeGpuName(text: string): string {
  return slugify(
    cleanText(text)
      .replace(/\b(?:nvidia|amd|ati)\b/g, " ")
      .replace(/\s+/g, " "),
  );
}
