import { slugify } from "../text";

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

/** An identity together with the span of the text it was read from. */
export interface Found {
  readonly start: number;
  readonly end: number;
  readonly identity: CpuIdentity;
}

/** One strategy of the registry: recognises a single model naming scheme. */
export interface CpuExtractor {
  /** Stable name; the registry's order of ids is asserted by a test. */
  readonly id: string;
  readonly extract: (text: string) => Found | null;
}

/** A trailing storage unit ("512gb") that a model-number pattern must not swallow. */
export const UNIT_SUFFIX = /(?:gb|tb|mb)$/i;

export const make = (
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

export const upper = (value: string | undefined): string => (value ?? "").toUpperCase();

export const titleCase = (value: string | undefined): string =>
  (value ?? "").replace(
    /(^|\s)([a-z])/g,
    (_, space: string, letter: string) => space + letter.toUpperCase(),
  );

export const regexExtractor = (
  id: string,
  pattern: RegExp,
  build: (m: RegExpExecArray) => Found | null,
): CpuExtractor => ({
  id,
  extract: (text) => {
    const m = pattern.exec(text);
    return m === null ? null : build(m);
  },
});
