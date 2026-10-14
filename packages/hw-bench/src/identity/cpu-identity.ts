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

/** Marketing "Intel Celeron N150" / "Intel Pentium N100" are the silicon PassMark lists as "Intel N150" (older N-series parts keep the brand). */
const intelBrandedN = regexExtractor(
  /(?<![a-z0-9])(?:intel\s+)?(?:celeron|pentium)\s+(n\d{2,3})(?![a-z0-9+])/,
  (m) => make(m, "Intel", "", upper(m[1])),
);

/** "Intel Core N355": PassMark names it "Intel Core 3 N355"; see `cpuNameKeys`. */
const intelCoreN = regexExtractor(/(?<![a-z0-9])(?:intel\s+)?core\s+(n\d{3})(?![a-z0-9+])/, (m) =>
  make(m, "Intel", "Core", upper(m[1])),
);

const intelEntry = regexExtractor(
  /(?<![a-z0-9])(?:intel\s+)?(celeron|pentium(?:\s+(?:gold|silver))?)\s+([a-z]{0,2}\d{3,5}[a-z]{0,2}\d?)(?![a-z0-9+])/,
  (m) => {
    return make(m, "Intel", titleCase(m[1]), upper(m[2]));
  },
);

/**
 * AMD writes "PRO" before the model ("Ryzen 5 PRO 230"); listings often put it behind ("Ryzen 5 230 Pro").
 * Both positions name the same part, and PRO stays part of the model: a PRO part is never its non-PRO sibling.
 */
const withPro = (words: readonly string[], pro: boolean, number: string): string =>
  [...words.filter((word) => word !== "PRO"), ...(pro ? ["PRO"] : []), number].join(" ");

const ryzenThreadripper = regexExtractor(
  /(?<![a-z0-9])(?:amd\s+)?ryzen\s+threadripper\s+(?:(pro)\s+)?(\d{4}[a-z]{0,2}(?:3d)?)(?:\s+(pro)(?![a-z0-9+]))?(?![a-z0-9+])/,
  (m) =>
    make(
      m,
      "AMD",
      "Ryzen Threadripper",
      withPro([], m[1] !== undefined || m[3] !== undefined, upper(m[2])),
    ),
);

const ryzen = regexExtractor(
  /(?<![a-z0-9])(?:amd\s+)?ryzen\s+(?:(ai)\s+)?(?:([3579])\s+)?((?:(?:pro|hx|h|max\+?)\s+)*)(\d{3,5}(?:[a-z]{1,2}(?:3d)?)?)(?:\s+(pro)(?![a-z0-9+]))?(?![a-z0-9+])/,
  (m) => {
    const number = upper(m[4]);
    if (UNIT_SUFFIX.test(number) || (m[1] === undefined && m[2] === undefined)) return null;
    const family = ["Ryzen", m[1] === undefined ? "" : "AI", m[2] ?? ""].filter(Boolean).join(" ");
    const words = upper(m[3]).split(/\s+/).filter(Boolean);
    return make(
      m,
      "AMD",
      family,
      withPro(words, words.includes("PRO") || m[5] !== undefined, number),
    );
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

/** PassMark appends the SoC code to the marketing name ("Mediatek Kompanio 838 MT8188"); listings omit it. */
const mediatekKompanio = regexExtractor(
  /(?<![a-z0-9])(?:mediatek\s+)?kompanio\s+(ultra\s+)?(\d{3,4})(?![a-z0-9+])/,
  (m) => make(m, "MediaTek", m[1] === undefined ? "Kompanio" : "Kompanio Ultra", m[2] ?? ""),
);

const EXTRACTORS: readonly Extractor[] = [
  intelCoreUltra,
  intelCoreI,
  intelBareI,
  intelCoreNumbered,
  intelN,
  intelBrandedN,
  intelCoreN,
  intelEntry,
  ryzenThreadripper,
  ryzen,
  athlon,
  apple,
  snapdragonX,
  mediatekKompanio,
];

type Scope = "anywhere" | "prefix" | "whole";

function findFound(text: string, scope: Scope): Found | null {
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
  return best;
}

const findIdentity = (text: string, scope: Scope): CpuIdentity | null =>
  findFound(text, scope)?.identity ?? null;

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

/** Vendors PassMark sometimes leaves off a name ("Snapdragon 7c @ 2.40 GHz") that listings prefix ("Qualcomm Snapdragon 7c"). */
const LEADING_VENDOR = /^(?:qualcomm|mediatek|intel|amd|nvidia|apple)\s+/;

/** `normalizeCpuName` without a leading vendor word; the fallback key for names that carry no identity. */
export function normalizeCpuNameWithoutVendor(text: string): string {
  return slugify(stripNameDecoration(cleanText(text)).text.replace(LEADING_VENDOR, ""));
}

/** Sub-brand words that follow the family in PassMark names ("Pentium Silver N6000") but that listings often drop. */
const OPTIONAL_SUB_BRAND = /^(Pentium|Athlon) (?:Silver|Gold)$/;

/**
 * "MediaTek Kompanio 520-528 (MT8186-MT8186T)": PassMark folds the models sold under both numbers into one record and
 * writes the range with a hyphen. Both listed numbers are covered, nothing in between: the key of the last number.
 * Only for purely numeric models of equal length, so suffix letters never join a range.
 */
function rangeEnd(rest: string, identity: CpuIdentity): string | null {
  const m = /^-(\d+)(?![a-z0-9+])/.exec(rest);
  const last = m?.[1];
  if (
    last === undefined ||
    !/^\d+$/.test(identity.model) ||
    last.length !== identity.model.length
  ) {
    return null;
  }
  return Number(last) > Number(identity.model) && identity.key.endsWith(identity.model)
    ? identity.key.slice(0, -identity.model.length) + last
    : null;
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
    if (/^Core [357]$/.test(whole.family) && /^N\d{3}$/.test(whole.model)) {
      add(slugify(`Intel Core ${whole.model}`), base);
    }
    // "Pentium Silver N6000" is also "Pentium N6000"; losing against a record that is named so, and ambiguous if two sub-brands share the number.
    const brand = OPTIONAL_SUB_BRAND.exec(whole.family);
    if (brand?.[1] !== undefined)
      add(slugify(`${whole.vendor} ${brand[1]} ${whole.model}`), base + 1);
  } else {
    const prefix = findFound(stripped.text, "prefix");
    if (prefix !== null) {
      add(prefix.identity.key, base + 2);
      const last = rangeEnd(stripped.text.slice(prefix.end), prefix.identity);
      if (last !== null) add(last, base + 2);
    }
  }
  return [...keys].map(([key, penalty]) => ({ key, penalty }));
}
