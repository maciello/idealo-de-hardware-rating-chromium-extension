import { cleanText, slugify, stripNameDecoration } from "./text";

/** CPU model extracted from free text, e.g. vendor=Intel family="Core i7" model=13700H. */
export interface CpuIdentity {
  /** Canonical key, e.g. "intel-core-i7-13700h". Equal keys mean the same silicon. */
  readonly key: string;
  readonly vendor: string;
  readonly family: string;
  readonly model: string;
  /** Only set for chips where the core count is part of the name (Apple M-series). */
  readonly cores: number | null;
  /** Key without the core count, for ambiguity lookups ("apple-m4"); null if the key has no core count. */
  readonly coreAgnosticKey: string | null;
}

interface Found {
  readonly start: number;
  readonly end: number;
  readonly identity: CpuIdentity;
}

type Extractor = (text: string) => Found | null;

const UNIT_SUFFIX = /(?:gb|tb|mb)$/i;

const make = (
  m: RegExpExecArray,
  vendor: string,
  family: string,
  model: string,
  cores: number | null = null,
): Found => {
  const base = [vendor, family, model].filter((part) => part !== "").join(" ");
  const key = slugify(cores === null ? base : `${base} ${cores} core`);
  return {
    start: m.index,
    end: m.index + m[0].length,
    identity: {
      key,
      vendor,
      family,
      model,
      cores,
      coreAgnosticKey: cores === null ? null : slugify(base),
    },
  };
};

const upper = (value: string | undefined): string => (value ?? "").toUpperCase();

const titleCase = (value: string | undefined): string =>
  (value ?? "").replace(
    /(^|\s)([a-z])/g,
    (_, space: string, letter: string) => space + letter.toUpperCase(),
  );

const regexExtractor =
  (pattern: RegExp, build: (m: RegExpExecArray) => Found | null): Extractor =>
  (text) => {
    const m = pattern.exec(text);
    return m === null ? null : build(m);
  };

const intelCoreI = regexExtractor(
  /(?<![a-z0-9])(?:intel\s+)?core\s*i([3579])(?:\s*-\s*(\d{3,5}[a-z]{0,3}\d?|n\d{3})|\s+(\d{4,5}[a-z]{0,3}\d?))(?![a-z0-9+])/,
  (m) => {
    const model = upper(m[2] ?? m[3]);
    return UNIT_SUFFIX.test(model) ? null : make(m, "Intel", `Core i${m[1]}`, model);
  },
);

const intelBareI = regexExtractor(
  /(?<![a-z0-9])i([3579])\s*-\s*(\d{3,5}[a-z]{0,3}\d?)(?![a-z0-9+])/,
  (m) => {
    const model = upper(m[2]);
    return UNIT_SUFFIX.test(model) ? null : make(m, "Intel", `Core i${m[1]}`, model);
  },
);

const intelCoreUltra = regexExtractor(
  /(?<![a-z0-9])(?:intel\s+)?core\s+ultra\s+([3579])\s+(\d{3}[a-z]{0,2}(?:\s+plus)?)(?![a-z0-9+])/,
  (m) => make(m, "Intel", `Core Ultra ${m[1]}`, upper(m[2])),
);

const intelCoreNumbered = regexExtractor(
  /(?<![a-z0-9])(?:intel\s+)?core\s+([357])\s+(n?\d{3}[a-z]{0,2})(?![a-z0-9+])/,
  (m) => make(m, "Intel", `Core ${m[1]}`, upper(m[2])),
);

const intelN = regexExtractor(
  /(?<![a-z0-9])intel\s+(?:processor\s+)?(n\d{2,3})(?![a-z0-9+])/,
  (m) => make(m, "Intel", "", upper(m[1])),
);

const intelEntry = regexExtractor(
  /(?<![a-z0-9])(?:intel\s+)?(celeron|pentium(?:\s+(?:gold|silver))?)\s+([a-z]{0,2}\d{3,5}[a-z]{0,2}\d?)(?![a-z0-9+])/,
  (m) => {
    return make(m, "Intel", titleCase(m[1]), upper(m[2]));
  },
);

const ryzenThreadripper = regexExtractor(
  /(?<![a-z0-9])(?:amd\s+)?ryzen\s+threadripper\s+((?:pro\s+)?\d{4}[a-z]{0,2}(?:3d)?)(?![a-z0-9+])/,
  (m) => make(m, "AMD", "Ryzen Threadripper", upper(m[1])),
);

const ryzen = regexExtractor(
  /(?<![a-z0-9])(?:amd\s+)?ryzen\s+(?:(ai)\s+)?(?:([3579])\s+)?((?:(?:pro|hx|h|max\+?)\s+)*)(\d{3,5}(?:[a-z]{1,2}(?:3d)?)?)(?![a-z0-9+])/,
  (m) => {
    const number = upper(m[4]);
    if (UNIT_SUFFIX.test(number) || (m[1] === undefined && m[2] === undefined)) return null;
    const family = ["Ryzen", m[1] === undefined ? "" : "AI", m[2] ?? ""].filter(Boolean).join(" ");
    const model = [upper(m[3]).trim(), number].filter(Boolean).join(" ");
    return make(m, "AMD", family, model);
  },
);

const athlon = regexExtractor(
  /(?<![a-z0-9])(?:amd\s+)?athlon\s+(?:(silver|gold|pro)\s+)?(\d{4}[a-z]{0,2})(?![a-z0-9+])/,
  (m) => {
    return make(m, "AMD", `Athlon ${titleCase(m[1])}`.trim(), upper(m[2]));
  },
);

const apple = regexExtractor(
  /(?<![a-z0-9])apple\s+m(\d)(?:\s+(pro|max|ultra))?(?:\s*[(,]?\s*(?:with\s+)?(\d{1,2})[\s-]?cores?\b(?!\s*gpu))?(?![a-z0-9+])/,
  (m) => {
    const tier = m[2] === undefined ? "" : ` ${titleCase(m[2])}`;
    const cores = m[3] === undefined ? null : Number(m[3]);
    return cores !== null && (cores < 1 || cores > 64)
      ? null
      : make(m, "Apple", "", `M${m[1]}${tier}`, cores);
  },
);

const snapdragonX = regexExtractor(
  /(?<![a-z0-9])(?:qualcomm\s+)?snapdragon\s+x(?:\s+(?:elite|plus))?\s*[-,]?\s*(x1[ep](?:-?\d{2}-?\d{3}|\d{3}[a-z]{2}))(?![a-z0-9+])/,
  (m) => {
    const code = upper(m[1]).replace(/-/g, "");
    const model = code.replace(/^(X1[EP])(\d{2})(\d{3})$/, "$1-$2-$3");
    return make(m, "Qualcomm", "Snapdragon", model);
  },
);

const EXTRACTORS: readonly Extractor[] = [
  intelCoreUltra,
  intelCoreI,
  intelBareI,
  intelCoreNumbered,
  intelN,
  intelEntry,
  ryzenThreadripper,
  ryzen,
  athlon,
  apple,
  snapdragonX,
];

type Scope = "anywhere" | "prefix" | "whole";

function findIdentity(text: string, scope: Scope): CpuIdentity | null {
  let best: Found | null = null;
  for (const extract of EXTRACTORS) {
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
  return best?.identity ?? null;
}

/**
 * Finds the CPU model inside an idealo title/spec string.
 * Suffix letters (U/H/HX/K/F/X3D/...) are part of the identity; returns null rather than guessing.
 */
export function extractCpuIdentity(text: string): CpuIdentity | null {
  return findIdentity(cleanText(text), "anywhere");
}

/** Generic key for any name: marks, "@ x GHz", case and separators removed. */
export function normalizeCpuName(text: string): string {
  return slugify(stripNameDecoration(cleanText(text)).text);
}

export interface CpuNameKey {
  readonly key: string;
  /**
   * 0 = the name itself; 1 = PassMark appended "with Radeon ..."; +2 = the name only starts with the model
   * ("Ryzen 7 4850U Mobile"). On equal keys the lowest penalty wins, so plain names beat decorated ones.
   */
  readonly penalty: number;
}

/**
 * Index keys for a PassMark CPU name: the generic key, the structural key when the whole name is a
 * recognised model, and (with a penalty) the structural key when the name merely starts with one.
 */
export function cpuNameKeys(name: string): readonly CpuNameKey[] {
  const stripped = stripNameDecoration(cleanText(name));
  const base = stripped.decorated ? 1 : 0;
  const keys = new Map<string, number>();
  const add = (key: string, penalty: number): void => {
    keys.set(key, Math.min(keys.get(key) ?? penalty, penalty));
  };
  add(slugify(stripped.text), base);
  const whole = findIdentity(stripped.text, "whole");
  if (whole !== null) {
    add(whole.key, base);
    if (whole.coreAgnosticKey !== null) add(whole.coreAgnosticKey, base);
  } else {
    const prefix = findIdentity(stripped.text, "prefix");
    if (prefix !== null) add(prefix.key, base + 2);
  }
  return [...keys].map(([key, penalty]) => ({ key, penalty }));
}
