import { regexExtractor, titleCase, upper, words } from "./regex";

export const geforce = regexExtractor(
  "geforce",
  /(?<![a-z0-9])(?:geforce\s+)?(rtx|gtx|gt|mx)\s*(\d{3,4})(?:\s+(a)(?![a-z0-9]))?((?:\s*(?:ti|super)(?![a-z0-9]))*)/,
  (m) => {
    const family = `GeForce ${upper(m[1])}`;
    const mods = (m[4] ?? "").trim().split(/\s+/).filter(Boolean).map(titleCase);
    return { vendor: "NVIDIA", family, model: words(m[2], m[3] && "A", ...mods) };
  },
);

/** Ada workstation parts: "RTX 2000 Ada" ≡ PassMark "RTX 2000 Ada Generation [Laptop GPU]". */
export const rtxAda = regexExtractor(
  "rtx-ada",
  /(?<![a-z0-9])rtx\s+(\d{3,4}e?)\s+ada(?:\s+generation)?(?![a-z0-9+])/,
  (m) => ({ vendor: "NVIDIA", family: "RTX Ada", model: upper(m[1]) }),
);

/** Ampere workstation parts, also written "Quadro RTX A4000". */
export const rtxA = regexExtractor(
  "rtx-a",
  /(?<![a-z0-9])(?:quadro\s+)?rtx\s+(a\d{3,4}h?)(?![a-z0-9+])/,
  (m) => ({ vendor: "NVIDIA", family: "RTX", model: upper(m[1]) }),
);

/** "RTX PRO" is Blackwell-only branding, so the architecture word is optional. */
export const rtxPro = regexExtractor(
  "rtx-pro",
  /(?<![a-z0-9])rtx\s+pro\s+(\d{3,4})(?:[\s[(]+blackwell(?:\s+generation)?[\])]?)?(?![a-z0-9+])/,
  (m) => ({ vendor: "NVIDIA", family: "RTX PRO", model: `${m[1] ?? ""} Blackwell` }),
);

/** Turing workstation parts "T1200", "Quadro T400"; a bare "T400" only counts as the whole name. */
export const quadroT = regexExtractor(
  "quadro-t",
  /(?:(?<![a-z0-9])(?:nvidia\s+)?quadro\s+|(?<![a-z0-9])nvidia\s+|^)(t\d{3,4})(?![a-z0-9+])/,
  (m) => ({ vendor: "NVIDIA", family: "T", model: upper(m[1]) }),
);
