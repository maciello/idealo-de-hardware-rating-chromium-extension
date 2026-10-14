import { make, regexExtractor, titleCase, UNIT_SUFFIX, upper } from "../model";

/**
 * AMD writes "PRO" before the model ("Ryzen 5 PRO 230"); listings often put it behind ("Ryzen 5 230 Pro").
 * Both positions name the same part, and PRO stays part of the model: a PRO part is never its non-PRO sibling.
 */
const withPro = (words: readonly string[], pro: boolean, number: string): string =>
  [...words.filter((word) => word !== "PRO"), ...(pro ? ["PRO"] : []), number].join(" ");

export const ryzenThreadripper = regexExtractor(
  "ryzen-threadripper",
  /(?<![a-z0-9])(?:amd\s+)?ryzen\s+threadripper\s+(?:(pro)\s+)?(\d{4}[a-z]{0,2}(?:3d)?)(?:\s+(pro)(?![a-z0-9+]))?(?![a-z0-9+])/,
  (m) =>
    make(
      m,
      "AMD",
      "Ryzen Threadripper",
      withPro([], m[1] !== undefined || m[3] !== undefined, upper(m[2])),
    ),
);

export const ryzen = regexExtractor(
  "ryzen",
  /(?<![a-z0-9])(?:amd\s+)?ryzen\s+(?:(ai)\s+)?(?:([3579])\s+)?((?:(?:pro|hx|h|max\+?)\s+)*)(\d{3,5}(?:[a-z]{1,2}(?:3d\d?)?)?)(?:\s+(pro)(?![a-z0-9+]))?(?![a-z0-9+])/,
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

export const athlon = regexExtractor(
  "athlon",
  /(?<![a-z0-9])(?:amd\s+)?athlon\s+(?:(silver|gold|pro)\s+)?(\d{4}[a-z]{0,2})(?![a-z0-9+])/,
  (m) => {
    return make(m, "AMD", `Athlon ${titleCase(m[1])}`.trim(), upper(m[2]));
  },
);
