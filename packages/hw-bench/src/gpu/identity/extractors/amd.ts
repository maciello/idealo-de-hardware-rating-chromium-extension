import { regexExtractor, upper, words } from "./regex";

export const radeonRx = regexExtractor(
  "radeon-rx",
  /(?<![a-z0-9])(?:radeon\s+)?rx\s*(\d{3,4})([ms])?(?:\s*(xtx|xt|gre)(?![a-z0-9]))?(?![a-z0-9+])/,
  (m) => ({
    vendor: "AMD",
    family: "Radeon RX",
    model: words(`${m[1] ?? ""}${upper(m[2])}`, upper(m[3])),
  }),
);

export const radeonIntegrated = regexExtractor(
  "radeon-integrated",
  /(?<![a-z0-9])radeon\s+(?:graphics\s+)?(\d{3,4}[a-z]{0,2})(?![a-z0-9+])/,
  (m) => ({ vendor: "AMD", family: "Radeon", model: upper(m[1]) }),
);
