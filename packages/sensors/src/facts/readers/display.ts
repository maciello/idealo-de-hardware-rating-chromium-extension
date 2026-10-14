import { groupKey } from "@idealo-hw/idealo-query";
import { firstMatch, type Reader, shortSideOf } from "../text";

/**
 * Pixel-grid height behind idealo's Display-Technologie names, keyed by the normalized name. A name
 * outside the table gives no fact. "HD Ready" panels on idealo are 1366 x 768; "Retina" is Apple's
 * floor (2560 x 1600).
 */
const HEIGHT_BY_TECHNOLOGY: Readonly<Record<string, number>> = {
  xga: 768,
  wxga: 768,
  hd: 768,
  "hd ready": 768,
  "hd+": 900,
  "full hd": 1080,
  fhd: 1080,
  "full hd+": 1200,
  wuxga: 1200,
  qhd: 1440,
  wqhd: 1440,
  "2,5k": 1600,
  wqxga: 1600,
  retina: 1600,
  "2,8k": 1800,
  "4k": 2160,
  "4k uhd": 2160,
  uhd: 2160,
  "ultra hd": 2160,
};

const technologyHeight = (value: string): number | null =>
  HEIGHT_BY_TECHNOLOGY[groupKey(value)] ?? null;

/** Displayauflösung: "1.920 x 1.080 Pixel". */
export const readResolution: Reader = (values) => {
  const height = firstMatch(values, shortSideOf);
  return height === null ? {} : { displayHeightPx: height };
};

/** Display-Technologie: "Full HD", "WUXGA", "HD Ready". */
export const readTechnology: Reader = (values) => {
  const height = firstMatch(values, technologyHeight);
  return height === null ? {} : { displayHeightPx: height };
};
