import { maxMatch, type Reader } from "../text";

/** IEEE 802.11 amendment letter -> Wi-Fi generation. */
const GENERATION_BY_AMENDMENT: Readonly<Record<string, number>> = {
  b: 1,
  a: 2,
  g: 3,
  n: 4,
  ac: 5,
  ax: 6,
  be: 7,
};

const AMENDMENT = String.raw`(?:be|ax|ac|[abgn])`;
/** "IEEE 802.11ax", "802.11 a/b/g/n/ac". */
const IEEE = new RegExp(
  String.raw`802\.11\s*(${AMENDMENT}(?:\s*[/,]\s*${AMENDMENT})*)(?![a-z])`,
  "gi",
);
/** "Wi-Fi 6E", "WiFi 7". */
const BRANDED = /wi-?fi\s*([1-9])(?!\d)/gi;

const generationsOf = (value: string): number | null => {
  const found = [
    ...[...value.matchAll(IEEE)].flatMap(([, letters = ""]) =>
      letters
        .split(/[^a-z]+/i)
        .flatMap((letter) => GENERATION_BY_AMENDMENT[letter.toLowerCase()] ?? []),
    ),
    ...[...value.matchAll(BRANDED)].map(([, digit = ""]) => Number(digit)),
  ];
  return found.length === 0 ? null : Math.max(...found);
};

/** WLAN-Standard and WLAN-Standards: the newest generation named anywhere. */
export const readWifi: Reader = (values) => {
  const generation = maxMatch(values, generationsOf);
  return generation === null ? {} : { wifiGeneration: generation };
};
