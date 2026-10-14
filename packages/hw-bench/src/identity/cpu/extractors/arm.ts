import { make, regexExtractor, titleCase, upper } from "../model";

export const apple = regexExtractor(
  "apple",
  /(?<![a-z0-9])apple\s+m(\d)(?:\s+(pro|max|ultra))?(?:\s*[(,]?\s*(?:with\s+)?(\d{1,2})[\s-]?cores?\b(?!\s*gpu))?(?![a-z0-9+])/,
  (m) => {
    const tier = m[2] === undefined ? "" : ` ${titleCase(m[2])}`;
    const cores = m[3] === undefined ? null : Number(m[3]);
    return cores !== null && (cores < 1 || cores > 64)
      ? null
      : make(m, "Apple", "", `M${m[1]}${tier}`, cores);
  },
);

export const snapdragonX = regexExtractor(
  "snapdragon-x",
  /(?<![a-z0-9])(?:qualcomm\s+)?snapdragon\s+x(?:\s+(?:elite|plus))?\s*[-,]?\s*(x1[ep](?:-?\d{2}-?\d{3}|\d{3}[a-z]{2}))(?![a-z0-9+])/,
  (m) => {
    const code = upper(m[1]).replace(/-/g, "");
    const model = code.replace(/^(X1[EP])(\d{2})(\d{3})$/, "$1-$2-$3");
    return make(m, "Qualcomm", "Snapdragon", model);
  },
);

/** PassMark appends the SoC code to the marketing name ("Mediatek Kompanio 838 MT8188"); listings omit it. */
export const mediatekKompanio = regexExtractor(
  "mediatek-kompanio",
  /(?<![a-z0-9])(?:mediatek\s+)?kompanio\s+(ultra\s+)?(\d{3,4})(?![a-z0-9+])/,
  (m) => make(m, "MediaTek", m[1] === undefined ? "Kompanio" : "Kompanio Ultra", m[2] ?? ""),
);
