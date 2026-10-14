import { cleanText } from "../text";
import type { CpuIdentity, Found } from "./model";
import { CPU_EXTRACTORS } from "./registry";

export type Scope = "anywhere" | "prefix" | "whole";

export function findFound(text: string, scope: Scope): Found | null {
  let best: Found | null = null;
  for (const { extract } of CPU_EXTRACTORS) {
    const found = extract(text);
    if (found === null) continue;
    if (scope !== "anywhere" && found.start !== 0) continue;
    if (scope === "whole" && found.end !== text.length) continue;
    if (
      best === null ||
      found.start < best.start ||
      (found.start === best.start && found.end > best.end)
    ) {
      best = found;
    }
  }
  return best;
}

export const findIdentity = (text: string, scope: Scope): CpuIdentity | null =>
  findFound(text, scope)?.identity ?? null;

/**
 * Finds the CPU model inside an idealo title/spec string.
 * Suffix letters (U/H/HX/K/F/X3D/...) are part of the identity; returns null rather than guessing.
 */
export function extractCpuIdentity(text: string): CpuIdentity | null {
  return findIdentity(cleanText(text), "anywhere");
}
