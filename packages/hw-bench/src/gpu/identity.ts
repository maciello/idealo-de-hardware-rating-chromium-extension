import { cleanText, slugify } from "../identity/text";

/** GPU model extracted from free text, e.g. vendor=NVIDIA family="GeForce RTX" model="4060 Ti". */
export interface GpuIdentity {
  /** Canonical key without variant markers or memory, e.g. "geforce-rtx-4060-ti". */
  readonly key: string;
  readonly vendor: "NVIDIA" | "AMD" | "Intel";
  readonly family: string;
  readonly model: string;
  /**
   * VRAM in GB when the text states it directly after the model ("RTX 4060 (8GB)", "RTX 4060 Ti 16 GB",
   * "16384 MB"); not part of `key`. System RAM elsewhere in a title ("16GB RAM", "- 16GB DDR4") never counts.
   */
  readonly memoryGb: number | null;
  /** "laptop" when the text itself says Laptop GPU / (Mobile) / Max-Q; null when it says nothing. */
  readonly variant: "laptop" | null;
  /** The text says Max-Q. */
  readonly maxQ: boolean;
  /** Integrated graphics (Radeon nnnM/S, Iris, HD, UHD, Arc): not tied to laptops or desktops. */
  readonly integrated: boolean;
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

/** Families that live in the CPU/APU package: no form factor of their own, PassMark's category is only where samples came from. */
const INTEGRATED_FAMILY = /^(?:Radeon|Iris|HD Graphics|UHD Graphics|Arc)(?:\s|$)/;

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
  /(?<![a-z0-9])(?:intel\s+)?(?:iris\s+)?xe(?:\s+(max)(?:\s+(\d{3}))?)?(?![a-z0-9+-])/,
  (m) => ({ vendor: "Intel", family: "Iris Xe", model: words(m[1] && "MAX", m[2]) }),
);

const hdGraphics = regexExtractor(
  /(?<![a-z0-9])(?<!(?:radeon|ati|amd)\s+)(?:intel\s+)?hd(?:\s+graphics)?\s+(p?\d{3,4})(?![a-z0-9+])/,
  (m) => ({ vendor: "Intel", family: "HD Graphics", model: upper(m[1]) }),
);

const iris = regexExtractor(
  /(?<![a-z0-9])(?:intel\s+)?iris(?:\s+(plus|pro))?(?:\s+graphics)?\s+(p?\d{3,4})(?![a-z0-9+])/,
  (m) => ({ vendor: "Intel", family: words("Iris", m[1] && titleCase(m[1])), model: upper(m[2]) }),
);

/** Ada workstation parts: "RTX 2000 Ada" ≡ PassMark "RTX 2000 Ada Generation [Laptop GPU]". */
const rtxAda = regexExtractor(
  /(?<![a-z0-9])rtx\s+(\d{3,4}e?)\s+ada(?:\s+generation)?(?![a-z0-9+])/,
  (m) => ({ vendor: "NVIDIA", family: "RTX Ada", model: upper(m[1]) }),
);

/** Ampere workstation parts, also written "Quadro RTX A4000". */
const rtxA = regexExtractor(/(?<![a-z0-9])(?:quadro\s+)?rtx\s+(a\d{3,4}h?)(?![a-z0-9+])/, (m) => ({
  vendor: "NVIDIA",
  family: "RTX",
  model: upper(m[1]),
}));

/** "RTX PRO" is Blackwell-only branding, so the architecture word is optional. */
const rtxPro = regexExtractor(
  /(?<![a-z0-9])rtx\s+pro\s+(\d{3,4})(?:[\s[(]+blackwell(?:\s+generation)?[\])]?)?(?![a-z0-9+])/,
  (m) => ({ vendor: "NVIDIA", family: "RTX PRO", model: `${m[1] ?? ""} Blackwell` }),
);

/** Turing workstation parts "T1200", "Quadro T400"; a bare "T400" only counts as the whole name. */
const quadroT = regexExtractor(
  /(?:(?<![a-z0-9])(?:nvidia\s+)?quadro\s+|(?<![a-z0-9])nvidia\s+|^)(t\d{3,4})(?![a-z0-9+])/,
  (m) => ({ vendor: "NVIDIA", family: "T", model: upper(m[1]) }),
);

const uhd = regexExtractor(
  /(?<![a-z0-9])(?:intel\s+)?uhd(?:\s+graphics)?(?:\s+(\d{3,4}))?(?![a-z0-9+])/,
  (m) => ({ vendor: "Intel", family: "UHD Graphics", model: m[1] ?? "" }),
);

const EXTRACTORS: readonly Extractor[] = [
  geforce,
  radeonRx,
  radeonIntegrated,
  arc,
  irisXe,
  hdGraphics,
  iris,
  uhd,
  rtxAda,
  rtxA,
  rtxPro,
  quadroT,
];

/** A memory size directly after the model: "6GB", "(8 GB)", "16384 MB". Sizes followed by system-memory words are not VRAM. */
const MEMORY_AFTER_MODEL =
  /^\s*[([]?\s*(?:(\d{1,3})\s*gb|(\d{3,6})\s*mb)\b\s*[)\]]?(?!\s*(?:ram\b|ddr\d|ssd|hdd|nvme|arbeitsspeicher))/;
const LAPTOP_MARK = /\blaptop(?:\s+gpu)?\b|\(\s*mobile\s*\)|\bmobile\b|\bnotebook(?:\s+gpu)?\b/;
const MAX_Q = /\b(?:with\s+)?max[\s-]?q(?:\s+design)?\b/;
/** Words that appear around a GPU name but are not part of its identity. */
const NOISE =
  /\b(?:nvidia|amd|ati|intel|graphics|gpu|grafik|grafikkarte|with|design|series)\b|gddr\d+x?/g;

/** Reads the VRAM size right behind the model at `from`; returns where the size ends. */
function memoryAfter(text: string, from: number): { end: number; memoryGb: number | null } {
  const m = MEMORY_AFTER_MODEL.exec(text.slice(from));
  if (m === null) return { end: from, memoryGb: null };
  const gigabytes = m[1] !== undefined ? Number(m[1]) : Math.round(Number(m[2]) / 1024);
  return { end: from + m[0].length, memoryGb: gigabytes > 0 ? gigabytes : null };
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
  const memory = memoryAfter(rest, best.end);
  const residual = `${rest.slice(0, best.start)} ${rest.slice(memory.end)}`
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
    integrated: INTEGRATED_FAMILY.test(best.family),
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

/**
 * Looser key for names that `normalizeGpuName` could not match; only consulted after it found nothing.
 * Two naming conventions: a letter group written apart from its number is the same name ("WX 3100" = "WX3100"),
 * and PassMark's trailing noun "GPU" ("Qualcomm Adreno 618 GPU") is not part of the model. A name that is only
 * a family word plus "GPU" ("Qualcomm Adreno GPU") has no model number and keeps its word.
 */
export function looseGpuNameKey(text: string): string {
  const joined = normalizeGpuName(text).replace(/(?<=[a-z])-(?=\d)/g, "");
  const withoutNoun = joined.replace(/-gpu$/, "");
  return /\d/.test(withoutNoun) ? withoutNoun : joined;
}

/**
 * Key of the same card without the mobile "M" that idealo appends to Quadro models ("Quadro M2200M") and that PassMark
 * sometimes omits ("Quadro M2200", filed under Mobile); null for any other name.
 */
export function quadroWithoutMobileSuffix(text: string): string | null {
  const m = /^(quadro-[a-z]\d{3,4})m$/.exec(normalizeGpuName(text));
  return m?.[1] ?? null;
}

/**
 * PassMark names one record after two models of the same silicon: "Radeon RX 470/570". Returns the name once per
 * listed model ("Radeon RX 470", "Radeon RX 570"); any other name comes back unchanged.
 */
export function splitCombinedModelName(name: string): readonly string[] {
  const m = /(?<![a-z0-9])(\d{3,4})\/(\d{3,4})(?![a-z0-9/])/i.exec(name);
  if (m === null) return [name];
  return [m[1], m[2]].map((model) => name.replace(m[0], model ?? ""));
}
