import { cleanText, slugify } from "../../identity";
import { memoryAfter } from "./memory";
import type { Found, GpuIdentity } from "./model";
import { GPU_EXTRACTORS } from "./registry";

/** Families that live in the CPU/APU package: no form factor of their own, PassMark's category is only where samples came from. */
const INTEGRATED_FAMILY = /^(?:Radeon|Iris|HD Graphics|UHD Graphics|Arc)(?:\s|$)/;

const LAPTOP_MARK = /\blaptop(?:\s+gpu)?\b|\(\s*mobile\s*\)|\bmobile\b|\bnotebook(?:\s+gpu)?\b/;
const MAX_Q = /\b(?:with\s+)?max[\s-]?q(?:\s+design)?\b/;
/** Words that appear around a GPU name but are not part of its identity. */
const NOISE =
  /\b(?:nvidia|amd|ati|intel|graphics|gpu|grafik|grafikkarte|with|design|series)\b|gddr\d+x?/g;

/** The match that starts first; on the same start the longer one; on a full tie the earlier extractor. */
function findBest(text: string): Found | null {
  let best: Found | null = null;
  for (const { extract } of GPU_EXTRACTORS) {
    const found = extract(text);
    if (found === null) continue;
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

/**
 * Finds the GPU model inside an idealo spec value or title ("NVIDIA GeForce RTX 4060 (8GB)").
 * Covers GeForce RTX/GTX/GT/MX, RTX Ada/A/PRO and Turing T workstation parts, Radeon RX, integrated Radeon nnnM/S,
 * Intel Arc, Iris (Xe/Plus/Pro), HD and UHD.
 * Marker words (Laptop GPU, Mobile, Max-Q) and memory sizes are reported separately, never part of `key`.
 * Returns null for anything else rather than guessing.
 */
export function extractGpuIdentity(text: string): GpuIdentity | null {
  let rest = cleanText(text);
  const maxQ = MAX_Q.test(rest);
  rest = rest.replace(MAX_Q, " ");
  const laptop = maxQ || LAPTOP_MARK.test(rest);
  rest = rest.replace(LAPTOP_MARK, " ").replace(/\s+/g, " ").trim();

  const best = findBest(rest);
  if (best === null) return null;
  const memory = memoryAfter(rest, best.end);
  const residual = `${rest.slice(0, best.start)} ${rest.slice(memory.end)}`
    .replace(NOISE, " ")
    .replace(/[(),;/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    key: slugify([best.family, best.model].filter((part) => part !== "").join(" ")),
    vendor: best.vendor,
    family: best.family,
    model: best.model,
    memoryGb: memory.memoryGb,
    variant: laptop ? "laptop" : null,
    maxQ,
    integrated: INTEGRATED_FAMILY.test(best.family),
    residual,
  };
}
