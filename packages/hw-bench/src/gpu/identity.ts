import { cleanText, slugify } from "../identity/text";

/** GPU model extracted from free text, e.g. vendor=NVIDIA family="GeForce RTX" model="4060 Ti". */
export interface GpuIdentity {
  /** Canonical key without variant markers or memory, e.g. "geforce-rtx-4060-ti". */
  readonly key: string;
  readonly vendor: "NVIDIA" | "AMD" | "Intel";
  readonly family: string;
  readonly model: string;
  /** Memory in GB when the text states it ("(8GB)", "16 GB", "16384 MB"); not part of `key`. */
  readonly memoryGb: number | null;
  /** "laptop" when the text itself says Laptop GPU / (Mobile) / Max-Q; null when it says nothing. */
  readonly variant: "laptop" | null;
  /** The text says Max-Q. */
  readonly maxQ: boolean;
  /** Text left over after the model and known noise words; empty means the text is exactly this GPU. */
  readonly residual: string;
}

interface Found {
  readonly start: number;
  readonly end: number;
  readonly vendor: GpuIdentity["vendor"];
  readonly family: string;
  readonly model: string;
}

type Extractor = (text: string) => Found | null;

const upper = (value: string | undefined): string => (value ?? "").toUpperCase();

const titleCase = (value: string): string =>
  value.replace(
    /(^|\s)([a-z])/g,
    (_, space: string, letter: string) => space + letter.toUpperCase(),
  );

const regexExtractor =
  (
    pattern: RegExp,
    build: (m: RegExpExecArray) => Omit<Found, "start" | "end"> | null,
  ): Extractor =>
  (text) => {
    const m = pattern.exec(text);
    if (m === null) return null;
    const built = build(m);
    return built === null ? null : { start: m.index, end: m.index + m[0].length, ...built };
  };

const words = (...parts: readonly (string | undefined)[]): string =>
  parts.filter((part) => part !== undefined && part !== "").join(" ");

const geforce = regexExtractor(
  /(?<![a-z0-9])(?:geforce\s+)?(rtx|gtx|gt|mx)\s*(\d{3,4})(?:\s+(a)(?![a-z0-9]))?((?:\s*(?:ti|super)(?![a-z0-9]))*)/,
  (m) => {
    const family = `GeForce ${upper(m[1])}`;
    const mods = (m[4] ?? "").trim().split(/\s+/).filter(Boolean).map(titleCase);
    return { vendor: "NVIDIA", family, model: words(m[2], m[3] && "A", ...mods) };
  },
);

const radeonRx = regexExtractor(
  /(?<![a-z0-9])(?:radeon\s+)?rx\s*(\d{3,4})([ms])?(?:\s*(xtx|xt|gre)(?![a-z0-9]))?(?![a-z0-9+])/,
  (m) => ({
    vendor: "AMD",
    family: "Radeon RX",
    model: words(`${m[1] ?? ""}${upper(m[2])}`, upper(m[3])),
  }),
);

const radeonIntegrated = regexExtractor(
  /(?<![a-z0-9])radeon\s+(?:graphics\s+)?(\d{3,4}[a-z]{0,2})(?![a-z0-9+])/,
  (m) => ({ vendor: "AMD", family: "Radeon", model: upper(m[1]) }),
);

const arc = regexExtractor(
  /(?<![a-z0-9])(?:intel\s+)?arc(?:\s+(pro))?(?:\s+(?:graphics\s+)?([a-z]?\d{2,4}[a-z]{0,2}))?(?![a-z0-9+/])/,
  (m) => ({
    vendor: "Intel",
    family: words("Arc", m[1] && "Pro"),
    model: upper(m[2]),
  }),
);

const irisXe = regexExtractor(
  /(?<![a-z0-9])(?:intel\s+)?iris\s+xe(?:\s+(max)(?:\s+(\d{3}))?)?(?![a-z0-9+])/,
  (m) => ({ vendor: "Intel", family: "Iris Xe", model: words(m[1] && "MAX", m[2]) }),
);

const uhd = regexExtractor(
  /(?<![a-z0-9])(?:intel\s+)?uhd(?:\s+graphics)?(?:\s+(\d{3,4}))?(?![a-z0-9+])/,
  (m) => ({ vendor: "Intel", family: "UHD Graphics", model: m[1] ?? "" }),
);

const EXTRACTORS: readonly Extractor[] = [geforce, radeonRx, radeonIntegrated, arc, irisXe, uhd];

/** Memory sizes, in GB. "16384 MB" -> 16. */
const MEMORY_GB = /\(?\s*\b(\d{1,3})\s*gb\b\s*\)?/;
const MEMORY_MB = /\(?\s*\b(\d{3,6})\s*mb\b\s*\)?/;
const LAPTOP_MARK = /\blaptop(?:\s+gpu)?\b|\(\s*mobile\s*\)|\bmobile\b|\bnotebook(?:\s+gpu)?\b/;
const MAX_Q = /\b(?:with\s+)?max[\s-]?q(?:\s+design)?\b/;
/** Words that appear around a GPU name but are not part of its identity. */
const NOISE =
  /\b(?:nvidia|amd|ati|intel|graphics|gpu|grafik|grafikkarte|with|design|series)\b|gddr\d+x?/g;

function takeMemoryGb(text: string): { text: string; memoryGb: number | null } {
  const gb = MEMORY_GB.exec(text);
  if (gb !== null) {
    return { text: text.replace(MEMORY_GB, " "), memoryGb: Number(gb[1]) };
  }
  const mb = MEMORY_MB.exec(text);
  if (mb !== null) {
    const gigabytes = Math.round(Number(mb[1]) / 1024);
    return { text: text.replace(MEMORY_MB, " "), memoryGb: gigabytes > 0 ? gigabytes : null };
  }
  return { text, memoryGb: null };
}

/**
 * Finds the GPU model inside an idealo spec value or title ("NVIDIA GeForce RTX 4060 (8GB)").
 * Covers GeForce RTX/GTX/GT/MX, Radeon RX, integrated Radeon nnnM/S, Intel Arc, Iris Xe and UHD.
 * Marker words (Laptop GPU, Mobile, Max-Q) and memory sizes are reported separately, never part of `key`.
 * Returns null for anything else rather than guessing.
 */
export function extractGpuIdentity(text: string): GpuIdentity | null {
  const memory = takeMemoryGb(cleanText(text));
  let rest = memory.text;
  const maxQ = MAX_Q.test(rest);
  rest = rest.replace(MAX_Q, " ");
  const laptop = maxQ || LAPTOP_MARK.test(rest);
  rest = rest.replace(LAPTOP_MARK, " ").replace(/\s+/g, " ").trim();

  let best: Found | null = null;
  for (const extract of EXTRACTORS) {
    const found = extract(rest);
    if (found === null) continue;
    if (
      best === null ||
      found.start < best.start ||
      (found.start === best.start && found.end > best.end)
    ) {
      best = found;
    }
  }
  if (best === null) return null;
  const residual = `${rest.slice(0, best.start)} ${rest.slice(best.end)}`
    .replace(NOISE, " ")
    .replace(/[(),;/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    key: slugify(words(best.family, best.model)),
    vendor: best.vendor,
    family: best.family,
    model: best.model,
    memoryGb: memory.memoryGb,
    variant: laptop ? "laptop" : null,
    maxQ,
    residual,
  };
}

/** Fallback key for names no extractor knows (Quadro, workstation cards): vendor words and marks removed. */
export function normalizeGpuName(text: string): string {
  return slugify(
    cleanText(text)
      .replace(/\b(?:nvidia|amd|ati)\b/g, " ")
      .replace(/\s+/g, " "),
  );
}
