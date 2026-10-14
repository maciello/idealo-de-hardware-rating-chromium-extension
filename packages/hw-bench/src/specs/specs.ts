import type { FormFactor } from "../identity";

/**
 * German idealo spec labels (compared case-insensitively, ignoring spaces, hyphens and a trailing colon).
 * Lists are ordered by preference. Extend here; no other code knows label names.
 */
export const SPEC_LABELS = {
  cpu: ["Prozessor", "Prozessortyp", "Prozessor-Typ", "Prozessormodell", "CPU"],
  gpu: ["Grafikkarte", "Grafikprozessor", "Grafikchip", "Grafikeinheit", "GPU"],
  /** Present on notebook pages ("Notebook-Typ: Gaming Notebook"). */
  laptopMarker: ["Notebook-Typ", "Notebooktyp", "Laptop-Typ"],
  /** Present on desktop PC pages ("PC-Typ: Gaming PC"). */
  desktopMarker: ["PC-Typ", "PC-Art", "Desktop-PC-Typ"],
} as const;

/** Title words that mark a laptop; checked before desktop words because "Laptop PC" is a laptop. */
export const LAPTOP_TITLE_WORDS =
  /(?<![\p{L}\d])(?:notebook|laptop|2[\s-]?in[\s-]?1|ultrabook|convertible|chromebook|macbook)(?![\p{L}\d])/iu;
export const DESKTOP_TITLE_WORDS =
  /(?<![\p{L}\d])(?:desktop|desktop[\s-]?pc|gaming[\s-]?pc|mini[\s-]?pc|tower|komplett[\s-]?pc|all[\s-]?in[\s-]?one)(?![\p{L}\d])/iu;

/** Values that name a kind of graphics, not a GPU model. */
const GENERIC_GPU_VALUE = /^(?:integriert|onboard|dediziert|shared(?:\s+memory)?|keine?|nein|ja)$/i;

/**
 * Parses idealo spec text into label -> value. Accepts "Label<TAB>Value" (idealo) and "Label: Value".
 * Blank lines and lines without a separator are skipped; the first occurrence of a label wins.
 */
export function parseSpecBlock(text: string): Map<string, string> {
  const specs = new Map<string, string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") continue;
    const tab = line.indexOf("\t");
    let label: string;
    let value: string;
    if (tab >= 0) {
      label = line.slice(0, tab);
      value = line.slice(tab + 1);
    } else {
      const colon =
        /^([^:]{1,80}?)\s*:\s+(.*)$/.exec(line) ?? /^([^:\s][^:]{0,79}):(.*)$/.exec(line);
      if (colon === null) continue;
      label = colon[1] ?? "";
      value = colon[2] ?? "";
    }
    label = label.trim().replace(/:$/, "").trim();
    value = value.replace(/\s*\t+\s*/g, " ").trim();
    if (label !== "" && value !== "" && !specs.has(label)) specs.set(label, value);
  }
  return specs;
}

const normalizeLabel = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[\s\-_:]+/g, "")
    .normalize("NFKC");

/** Value of the first label in `labels` (by preference) that exists in `specs`. */
function lookup(specs: ReadonlyMap<string, string>, labels: readonly string[]): string | undefined {
  const byLabel = new Map<string, string>();
  for (const [label, value] of specs) {
    const key = normalizeLabel(label);
    if (!byLabel.has(key)) byLabel.set(key, value);
  }
  for (const label of labels) {
    const value = byLabel.get(normalizeLabel(label));
    if (value !== undefined) return value;
  }
  return undefined;
}

const hasLabel = (specs: ReadonlyMap<string, string>, labels: readonly string[]): boolean =>
  lookup(specs, labels) !== undefined;

export interface ProductContext {
  readonly cpuText?: string;
  readonly gpuText?: string;
  readonly formFactor: FormFactor;
}

export interface ProductContextOptions {
  /** Product title; its words break the tie when no marker label exists. */
  readonly title?: string;
}

/**
 * Pure label rules: CPU/GPU text from known labels, form factor from marker labels, then title words.
 * "laptop" wins over "desktop" when both signals exist on the same level.
 */
export function productContextFromSpecs(
  specs: ReadonlyMap<string, string>,
  options: ProductContextOptions = {},
): ProductContext {
  const cpuText = lookup(specs, SPEC_LABELS.cpu);
  const rawGpu = lookup(specs, SPEC_LABELS.gpu);
  const gpuText = rawGpu === undefined || GENERIC_GPU_VALUE.test(rawGpu) ? undefined : rawGpu;

  let formFactor: FormFactor = "unknown";
  if (hasLabel(specs, SPEC_LABELS.laptopMarker)) formFactor = "laptop";
  else if (hasLabel(specs, SPEC_LABELS.desktopMarker)) formFactor = "desktop";
  else if (options.title !== undefined) {
    if (LAPTOP_TITLE_WORDS.test(options.title)) formFactor = "laptop";
    else if (DESKTOP_TITLE_WORDS.test(options.title)) formFactor = "desktop";
  }

  return {
    ...(cpuText === undefined ? {} : { cpuText }),
    ...(gpuText === undefined ? {} : { gpuText }),
    formFactor,
  };
}
