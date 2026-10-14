import { regexExtractor, titleCase, upper, words } from "./regex";

export const arc = regexExtractor(
  "arc",
  /(?<![a-z0-9])(?:intel\s+)?arc(?:\s+(pro))?(?:\s+(?:graphics\s+)?([a-z]?\d{2,4}[a-z]{0,2}))?(?![a-z0-9+/])/,
  (m) => ({
    vendor: "Intel",
    family: words("Arc", m[1] && "Pro"),
    model: upper(m[2]),
  }),
);

export const irisXe = regexExtractor(
  "iris-xe",
  /(?<![a-z0-9])(?:intel\s+)?(?:iris\s+)?xe(?:\s+(max)(?:\s+(\d{3}))?)?(?![a-z0-9+-])/,
  (m) => ({ vendor: "Intel", family: "Iris Xe", model: words(m[1] && "MAX", m[2]) }),
);

export const hdGraphics = regexExtractor(
  "hd-graphics",
  /(?<![a-z0-9])(?<!(?:radeon|ati|amd)\s+)(?:intel\s+)?hd(?:\s+graphics)?\s+(p?\d{3,4})(?![a-z0-9+])/,
  (m) => ({ vendor: "Intel", family: "HD Graphics", model: upper(m[1]) }),
);

export const iris = regexExtractor(
  "iris",
  /(?<![a-z0-9])(?:intel\s+)?iris(?:\s+(plus|pro))?(?:\s+graphics)?\s+(p?\d{3,4})(?![a-z0-9+])/,
  (m) => ({ vendor: "Intel", family: words("Iris", m[1] && titleCase(m[1])), model: upper(m[2]) }),
);

export const uhd = regexExtractor(
  "uhd",
  /(?<![a-z0-9])(?:intel\s+)?uhd(?:\s+graphics)?(?:\s+(\d{3,4}))?(?![a-z0-9+])/,
  (m) => ({ vendor: "Intel", family: "UHD Graphics", model: m[1] ?? "" }),
);
