import { make, regexExtractor, titleCase, UNIT_SUFFIX, upper } from "../model";

export const intelCoreI = regexExtractor(
  "intel-core-i",
  /(?<![a-z0-9])(?:intel\s+)?core\s*i([3579])(?:\s*-\s*(\d{3,5}[a-z]{0,3}\d?|n\d{3})|\s+(\d{4,5}[a-z]{0,3}\d?))(?![a-z0-9+])/,
  (m) => {
    const model = upper(m[2] ?? m[3]);
    return UNIT_SUFFIX.test(model) ? null : make(m, "Intel", `Core i${m[1]}`, model);
  },
);

export const intelBareI = regexExtractor(
  "intel-bare-i",
  /(?<![a-z0-9])i([3579])\s*-\s*(\d{3,5}[a-z]{0,3}\d?)(?![a-z0-9+])/,
  (m) => {
    const model = upper(m[2]);
    return UNIT_SUFFIX.test(model) ? null : make(m, "Intel", `Core i${m[1]}`, model);
  },
);

export const intelCoreUltra = regexExtractor(
  "intel-core-ultra",
  /(?<![a-z0-9])(?:intel\s+)?core\s+ultra\s+(x?[3579])\s+(\d{3}[a-z]{0,2}(?:\s+plus)?)(?![a-z0-9+])/,
  (m) => make(m, "Intel", `Core Ultra ${upper(m[1])}`, upper(m[2])),
);

export const intelCoreNumbered = regexExtractor(
  "intel-core-numbered",
  /(?<![a-z0-9])(?:intel\s+)?core\s+([3579])\s+(n?\d{3}[a-z]{0,2})(?![a-z0-9+])/,
  (m) => make(m, "Intel", `Core ${m[1]}`, upper(m[2])),
);

export const intelN = regexExtractor(
  "intel-n",
  /(?<![a-z0-9])intel\s+(?:processor\s+)?(n\d{2,3})(?![a-z0-9+])/,
  (m) => make(m, "Intel", "", upper(m[1])),
);

/** Marketing "Intel Celeron N150" / "Intel Pentium N100" are the silicon PassMark lists as "Intel N150" (older N-series parts keep the brand). */
export const intelBrandedN = regexExtractor(
  "intel-branded-n",
  /(?<![a-z0-9])(?:intel\s+)?(?:celeron|pentium)\s+(n\d{2,3})(?![a-z0-9+])/,
  (m) => make(m, "Intel", "", upper(m[1])),
);

/** "Intel Core N355": PassMark names it "Intel Core 3 N355"; see `cpuNameKeys`. */
export const intelCoreN = regexExtractor(
  "intel-core-n",
  /(?<![a-z0-9])(?:intel\s+)?core\s+(n\d{3})(?![a-z0-9+])/,
  (m) => make(m, "Intel", "Core", upper(m[1])),
);

export const intelEntry = regexExtractor(
  "intel-entry",
  /(?<![a-z0-9])(?:intel\s+)?(celeron|pentium(?:\s+(?:gold|silver))?)\s+([a-z]{0,2}\d{3,5}[a-z]{0,2}\d?)(?![a-z0-9+])/,
  (m) => {
    return make(m, "Intel", titleCase(m[1]), upper(m[2]));
  },
);
